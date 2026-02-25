"""
backend/api/routes/solve.py
Core solve endpoints — delegates all math to math_engine.engine.
"""
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException

from backend.api.schemas import (
    SolveRequest, SolveByChildRequest,
    SolveResponse, SolveAndPromptResponse,
    Step, ReviewSummary, PromptAttempt,
)
from backend.api.routes.children import CHILDREN
from backend.math_engine.engine import solve as engine_solve, build_review, pick_template
from backend.math_engine.grade_style import get_grade_style, topic_level_note
from backend.math_engine.topic_detector import detect_topic
from backend.core.llm import get_client, get_model
from backend.core.prompt_validator import (
    VIDEO_SCHEMA, VIDEO_PROMPT_CONTRACT,
    validate_video_prompt, run_prompt_checks, checks_pass, prompt_score,
)
from backend.knowledge.activity import append_activity
from backend.video_engine.video_cache import (
    cache_key, lookup as cache_lookup, register as cache_register, video_url_from_filename,
)
from backend.video_engine.tts import synthesize as tts_synthesize

logger = logging.getLogger(__name__)

ROUTER_REMOTION_URL = f"http://localhost:{os.environ.get('REMOTION_PORT', '1235')}"


def _get_curriculum_hints(child: dict, question: str) -> list[str]:
    """
    Try to retrieve curriculum-specific textbook hints for this child's question.
    Returns an empty list if the knowledge DB isn't set up or has no matching data.
    This function is intentionally safe — it never breaks the existing solve flow.
    """
    curriculum = child.get("preferred_curriculum")
    if not curriculum:
        return []
    try:
        from backend.knowledge.retrieval import retrieve_chunks
        from backend.knowledge.db import get_session_factory
        from backend.knowledge.models import Curriculum as CurriculumModel

        factory = get_session_factory()
        with factory() as db:
            row = db.query(CurriculumModel).filter(
                CurriculumModel.name == curriculum
            ).first()
            if not row:
                return []
            curriculum_id = row.id

        chunks = retrieve_chunks(
            question=question,
            curriculum_id=curriculum_id,
            class_level=child.get("class_level"),
            top_k=3,
            strict_class_level=child.get("strict_class_level", False),
        )
        return [c["text"] for c in chunks if c.get("text")]
    except Exception as exc:
        logger.debug(f"Curriculum hint retrieval skipped: {exc}")
        return []

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /solve  (simple solve — no LLM, no video)
# ---------------------------------------------------------------------------

@router.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    result = engine_solve(req.question, req.grade)
    return SolveResponse(
        topic=result.topic,
        answer=result.answer,
        steps=[Step(title=s.title, text=s.text) for s in result.steps],
        smaller_example=result.smaller_example,
    )


# ---------------------------------------------------------------------------
# POST /solve-and-video-prompt  (grade param) — legacy
# ---------------------------------------------------------------------------

@router.post("/solve-and-video-prompt", response_model=SolveAndPromptResponse)
def solve_and_video_prompt(req: SolveRequest):
    return _run_solve_and_prompt(req.question, req.grade)


# ---------------------------------------------------------------------------
# POST /solve-and-video-prompt/by-child  (child profile) — legacy
# ---------------------------------------------------------------------------

@router.post("/solve-and-video-prompt/by-child", response_model=SolveAndPromptResponse)
def solve_and_video_prompt_by_child(req: SolveByChildRequest):
    child = CHILDREN.get(req.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    hints = _get_curriculum_hints(child, req.question)
    result = _run_solve_and_prompt(req.question, child["class_level"], curriculum_hints=hints)
    append_activity(
        child_id=req.child_id,
        question=req.question,
        topic=result.topic,
        template=result.template,
        score=result.final_score,
    )
    return result


# ---------------------------------------------------------------------------
# POST /solve-and-render  (V2 — unified solve + render in one call)
# ---------------------------------------------------------------------------

@router.post("/solve-and-render", response_model=SolveAndPromptResponse)
def solve_and_render(req: SolveRequest):
    return _run_solve_and_render(req.question, req.grade)


@router.post("/solve-and-render/by-child", response_model=SolveAndPromptResponse)
def solve_and_render_by_child(req: SolveByChildRequest):
    child = CHILDREN.get(req.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    hints = _get_curriculum_hints(child, req.question)
    result = _run_solve_and_render(req.question, child["class_level"], curriculum_hints=hints)
    append_activity(
        child_id=req.child_id,
        question=req.question,
        topic=result.topic,
        template=result.template,
        score=result.final_score,
    )
    return result


# ---------------------------------------------------------------------------
# POST /try-similar/by-child
# ---------------------------------------------------------------------------

@router.post("/try-similar/by-child")
def try_similar_by_child(req: SolveByChildRequest):
    """
    Generate a similar practice question for the child.
    Uses LLM to produce a related question at the same difficulty.
    """
    child = CHILDREN.get(req.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    topic = detect_topic(req.question)
    grade = child["class_level"]
    style = get_grade_style(grade)

    try:
        client = get_client()
        model = get_model()
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a primary school math teacher. "
                        "Return ONLY a single math question similar to the one given. "
                        "No explanation. No answer. Just the question."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Grade: {grade}, Topic: {topic}, Vocab: {style.get('vocab', 'simple')}.\n"
                        f"Original question: {req.question}\n"
                        "Generate ONE similar question."
                    ),
                },
            ],
            temperature=0.7,
        )
        similar = resp.choices[0].message.content.strip() if resp.choices else ""
        return {"question": similar}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not generate similar question: {exc}")


# ---------------------------------------------------------------------------
# Internal: run full solve + LLM video prompt pipeline
# ---------------------------------------------------------------------------

def _run_solve_and_prompt(question: str, grade: int, curriculum_hints: list[str] | None = None) -> SolveAndPromptResponse:
    # Step 1: Deterministic solve via math engine
    result = engine_solve(question, grade, curriculum_hints=curriculum_hints)
    topic = result.topic
    template = result.template
    review_data = build_review(topic, template, result.is_above_grade, [])

    review = ReviewSummary(
        concept=review_data["concept"],
        objects_used=review_data["objects_used"],
        prerequisite_used=review_data["prerequisite_used"],
        common_mistake=review_data["common_mistake"],
    )

    # If solver couldn't determine an answer, return early without LLM
    if result.solver_used == "unsupported":
        return SolveAndPromptResponse(
            topic=topic,
            verified_answer=result.answer,
            verified_steps=[Step(title=s.title, text=s.text) for s in result.steps],
            template=template,
            min_grade_for_topic=result.min_grade_for_topic,
            is_above_grade=result.is_above_grade,
            review=review,
            attempts=[],
            final_prompt="{}",
            final_passed=False,
            final_score=0,
            video_prompt_json=None,
            schema_valid=False,
        )

    verified_answer = result.answer

    # Step 2: LLM video prompt generation (director-cue format)
    client = get_client()
    model = get_model()
    style = get_grade_style(grade)
    level_note = topic_level_note(topic, grade)
    schema_text = json.dumps(VIDEO_SCHEMA or {}, ensure_ascii=True)

    # Build topic-specific guidance for the LLM director
    topic_guidance = _build_topic_guidance(topic, verified_answer)

    # Adjust constraints based on whether a smaller example is forced
    scene_rules = (
        "- Limit the total number of scenes to 5-7 maximum (Small Example -> Equation -> Main Problem -> Equation).\n"
        f"- CRITICAL: The smaller example MUST use the exact same math operation ({topic}) as the main problem. Do not explain {topic} using the wrong terminology.\n"
        if level_note else
        "- DO NOT create 'smaller starter examples' or invent your own problems. Solve ONLY the exact problem provided.\n"
        "- Limit the total number of scenes to 3-4 maximum. A 3-scene video is best (Setup -> Action/Math -> Equation).\n"
    )

    pedagogy_note = (
        "PEDAGOGY & TIMING RULES:\n"
        "- Do NOT rush to the answer. The goal is to help children UNDERSTAND math, not memorize it.\n"
        f"- Explicitly state that we are doing {topic} by name (e.g. 'Since we are sharing equally, this is a division problem'). Explain the 'why' behind the math operation.\n"
        "- Do NOT use phrasing like 'secret code' or 'magic trick' for equations. Equations are just a way to write what we did visually.\n"
        "- Your narration dictates how long a scene stays on screen. To give visual animations time to play out, do not rush your words. You can use pauses (like commas or periods) when many items are appearing.\n"
    )

    base_content = f"""
You are a video director for a children's math learning app.
Generate a Director Script as STRICT JSON for this problem.

The JSON schema defines action-based scenes. Each scene is a "Director Cue" that tells
the animation engine what to render. Available actions and when to use them:

- ADD_ITEMS: Show items appearing on screen (use for addition, counting)
- REMOVE_ITEMS: Show items disappearing (use for subtraction)
- GROUP_ITEMS: Show items arranged in groups (use for multiplication, division)
  → requires "groups" and "per_group" fields
- SPLIT_ITEM: Show a shape split into parts (use for fractions)
  → requires "numerator" and "denominator" fields
- SHOW_EQUATION: Display a math equation prominently
  → requires "equation" field
- HIGHLIGHT: Emphasize/highlight existing items

Available item_type: APPLE_SVG, BLOCK_SVG, STAR_SVG, COUNTER
Available animation_style: BOUNCE_IN, FADE_IN, SLIDE_LEFT, POP, NONE

Schema:
{schema_text}

Grade: {grade}
Topic: {topic}
Template: {template}
Max duration seconds: {style["max_seconds"]}
Sentence length: {style["sentence_length"]}
Pace: {style["pace"]}
Vocabulary: {style["vocab"]}
{topic_guidance}

Problem: {question}
Correct answer (must match): {verified_answer}

{level_note}

{pedagogy_note}

Rules:
- STRICT STORYBOARD: Do not repeat steps or jump back and forth. Follow a logical progression.
{scene_rules}
- Make sure narration matches the action perfectly.
- ALWAYS end with a SHOW_EQUATION scene showing the final answer to the main problem.
- Return ONLY valid JSON matching the schema exactly.
- No markdown. No extra text.
"""

    attempts = []
    final_prompt = ""
    final_passed = False
    final_score = 0
    final_prompt_json = None
    final_schema_valid = False

    for attempt_num in [1, 2]:
        user_content = base_content
        if attempt_num == 2:
            user_content += """
Retry with stricter enforcement:
- Return ONLY a JSON object, no markdown, no explanation.
- Ensure narration satisfies the hard requirement above.
"""
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": f"{VIDEO_PROMPT_CONTRACT}\n\nSchema:\n{schema_text}"},
                {"role": "user", "content": user_content},
            ],
            temperature=0.4,
        )
        prompt_text = resp.choices[0].message.content.strip() if resp.choices else ""
        schema_valid, prompt_json, validation_error = validate_video_prompt(prompt_text)
        checks = run_prompt_checks(prompt_text, verified_answer, topic, schema_valid, prompt_json)

        if validation_error:
            checks["failure_reason"] = validation_error
        elif not checks.get("includes_correct_answer"):
            checks["failure_reason"] = "Missing verified answer in JSON output."
        elif not checks.get("hard_topic_ok"):
            checks["failure_reason"] = f"Hard topic check failed: {checks.get('hard_topic_rule')}"

        score = prompt_score(topic, checks)
        passed = checks_pass(checks)

        attempts.append(PromptAttempt(
            attempt=attempt_num,
            prompt=prompt_text,
            checks=checks,
            score=score,
            passed=passed,
        ))

        final_prompt = prompt_text
        final_passed = passed
        final_score = score
        final_prompt_json = prompt_json
        final_schema_valid = schema_valid
        if passed:
            break

    return SolveAndPromptResponse(
        topic=topic,
        verified_answer=verified_answer,
        verified_steps=[Step(title=s.title, text=s.text) for s in result.steps],
        template=template,
        min_grade_for_topic=result.min_grade_for_topic,
        is_above_grade=result.is_above_grade,
        review=review,
        attempts=attempts,
        final_prompt=final_prompt,
        final_passed=final_passed,
        final_score=final_score,
        video_prompt_json=final_prompt_json,
        schema_valid=final_schema_valid,
    )


# ---------------------------------------------------------------------------
# Topic-specific director guidance
# ---------------------------------------------------------------------------

def _build_topic_guidance(topic: str, verified_answer: str) -> str:
    if topic == "multiplication":
        return (
            "Topic guidance: Sequence MUST be:\n"
            "1. ADD_ITEMS to show a single group of objects.\n"
            "2. GROUP_ITEMS to show all groups together.\n"
            "3. SHOW_EQUATION for the final answer.\n"
            "Use BLOCK_SVG. Set groups and per_group fields."
        )
    elif topic == "division":
        return (
            "Topic guidance: Sequence MUST be:\n"
            "1. ADD_ITEMS to show the starting total number of items.\n"
            "2. GROUP_ITEMS to show them shared/divided into groups.\n"
            "3. SHOW_EQUATION for the final answer.\n"
            "Use COUNTER as item_type. Set groups and per_group."
        )
    elif topic == "fractions":
        return (
            "Topic guidance: Use SPLIT_ITEM action with PIE_CHART or BAR_CHART.\n"
            "Set numerator and denominator fields.\n"
            'Narration must mention "equal parts".'
        )
    elif topic == "subtraction":
        return (
            "Topic guidance: Use ADD_ITEMS first to show the starting count,\n"
            "then REMOVE_ITEMS to take some away.\n"
            "Use APPLE_SVG or STAR_SVG as item_type.\n"
            'Narration must mention "take away" or "remove".'
        )
    else:
        return (
            "Topic guidance: Use ADD_ITEMS to show counting objects.\n"
            "Use APPLE_SVG or BLOCK_SVG as item_type.\n"
            'Narration must mention "counters" or "blocks".'
        )


# ---------------------------------------------------------------------------
# V2: Unified solve + render pipeline
# ---------------------------------------------------------------------------

def _render_via_remotion(prompt_json: dict, audio_paths: list[Path] | None) -> dict | None:
    """Send the JSON script and audio files to the Remotion Express server to render."""
    import httpx

    try:
        body: dict = {"script": prompt_json}
        if audio_paths:
            # Remotion expects an array of URLs — for local, we serve them via FastAPI static mount
            # We preserve exactly the same array length, placing empty strings for missing audios
            body["audioUrls"] = [
                f"http://localhost:1233/videos/{p.name}" if p and p.exists() else ""
                for p in audio_paths
            ]

        key = cache_key(prompt_json.get("problem", ""), prompt_json.get("grade", 0))
        body["outputName"] = f"{key}.mp4"

        with httpx.Client(timeout=120.0) as client:
            resp = client.post(f"{ROUTER_REMOTION_URL}/render", json=body)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.error(f"Remotion render failed: {exc}")
        return None


def _run_solve_and_render(question: str, grade: int, curriculum_hints: list[str] | None = None) -> SolveAndPromptResponse:
    """
    Full pipeline: solve → LLM script → cache check → TTS → Remotion render → cache.
    Returns a SolveAndPromptResponse with video_url populated.
    """
    # Step 1: Check cache first
    key = cache_key(question, grade)
    cached_filename = cache_lookup(key)
    if cached_filename:
        # Still need the solve data
        solve_result = _run_solve_and_prompt(question, grade)
        solve_result.video_url = video_url_from_filename(cached_filename)
        solve_result.video_cached = True
        solve_result.video_generated_by = "remotion"
        logger.info(f"Cache HIT for '{question}' grade {grade}: {cached_filename}")
        return solve_result

    # Step 2: Run the full solve + LLM prompt pipeline
    solve_result = _run_solve_and_prompt(question, grade, curriculum_hints=curriculum_hints)

    if not solve_result.video_prompt_json:
        logger.warning("No video prompt JSON generated — skipping render")
        return solve_result

    # Step 3: Generate TTS narration per scene
    audio_paths = []
    tmp_dir = Path(tempfile.mkdtemp(prefix="mymath_tts_"))
    from backend.video_engine.video_cache import OUTPUT_DIR
    import shutil

    scenes = solve_result.video_prompt_json.get("scenes", [])
    for i, scene in enumerate(scenes):
        narration = str(scene.get("narration", "")).strip()
        if not narration:
            audio_paths.append(None)
            continue
            
        audio_output = tmp_dir / f"{key}_scene{i}.wav"
        audio_path = tts_synthesize(narration, audio_output)
        
        if audio_path and audio_path.exists():
            dest = OUTPUT_DIR / audio_path.name
            shutil.copy2(str(audio_path), str(dest))
            audio_paths.append(dest)
        else:
            audio_paths.append(None)

    # Step 4: Render via Remotion
    render_result = _render_via_remotion(solve_result.video_prompt_json, audio_paths)

    if render_result and render_result.get("outputName"):
        filename = render_result["outputName"]
        cache_register(key, filename)
        solve_result.video_url = video_url_from_filename(filename)
        solve_result.video_cached = False
        solve_result.video_generated_by = "remotion"
        logger.info(f"Remotion render complete: {filename}")
    else:
        # Fallback: try the old template renderer
        logger.warning("Remotion failed — falling back to template renderer")
        try:
            from backend.video_engine.renderer import render_video
            old_result = render_video(solve_result.video_prompt_json, f"{key}.mp4")
            filename = Path(old_result["output_path"]).name
            cache_register(key, filename)
            solve_result.video_url = video_url_from_filename(filename)
            solve_result.video_cached = False
            solve_result.video_generated_by = "template"
        except Exception as exc:
            logger.error(f"Template renderer fallback also failed: {exc}")
            solve_result.video_generated_by = "none"

    return solve_result
