"""
backend/api/routes/solve.py
Core solve endpoints — delegates all math to math_engine.engine.
"""
import json
import logging
import os
import re
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
    curriculum = child.get("preferred_curriculum", "nctb")
    result = _run_solve_and_prompt(
        req.question, child["class_level"],
        curriculum_hints=hints,
        curriculum=curriculum,
    )
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
    curriculum = child.get("preferred_curriculum", "nctb")
    result = _run_solve_and_render(
        req.question,
        child["class_level"],
        curriculum_hints=hints,
        curriculum=curriculum,
        pre_solved_answer=req.pre_solved_answer,
        pre_solved_steps=req.pre_solved_steps,
        question_type=req.question_type,
    )
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
    curriculum = child.get("preferred_curriculum", "nctb")

    # Load curriculum style for NCTB-appropriate similar questions
    from backend.video_engine.template_registry import load_curriculum_style
    curr_style = load_curriculum_style(curriculum)
    locale_hint = ""
    if curr_style:
        locale_examples = curr_style.get("cultural_context", {}).get("locale_examples", [])
        currency = curr_style.get("cultural_context", {}).get("currency", "")
        metaphors = curr_style.get("default_visual_metaphors_by_topic", {}).get(topic, [])
        if locale_examples or metaphors:
            locale_hint = (
                f"\nCurriculum: {curr_style.get('full_name', curriculum)}. "
                f"Use culturally familiar everyday contexts: {', '.join(locale_examples[:4])}. "
                + (f"For {topic}, prefer objects like: {', '.join(metaphors[:3])}." if metaphors else "")
                + (f" Currency if relevant: {currency}." if currency else "")
            )

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
                        f"Grade: {grade}, Topic: {topic}, Vocab: {style.get('vocab', 'simple')}.{locale_hint}\n"
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

def _run_solve_and_prompt(
    question: str,
    grade: int,
    curriculum_hints: list[str] | None = None,
    pre_solved_answer: str | None = None,
    pre_solved_steps: list[str] | None = None,
    question_type: str | None = None,
    curriculum: str | None = None,
) -> SolveAndPromptResponse:
    # Step 1: Deterministic/LLM solve via math engine
    result = engine_solve(
        question,
        grade,
        curriculum_hints=curriculum_hints,
        pre_solved_answer=pre_solved_answer,
        pre_solved_steps=pre_solved_steps,
    )
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
    effective_topic = question_type if question_type in ("mcq", "true_false") else topic
    topic_guidance = _build_topic_guidance(effective_topic, verified_answer, template, question=question)

    # --- Curriculum style block -------------------------------------------------
    # Load the curriculum style and inject cultural/visual context into the prompt
    from backend.video_engine.template_registry import load_curriculum_style
    curr_style = load_curriculum_style(curriculum or "nctb")
    curriculum_block = ""
    if curr_style:
        metaphors = curr_style.get("default_visual_metaphors_by_topic", {}).get(topic, [])
        locale_examples = curr_style.get("cultural_context", {}).get("locale_examples", [])
        currency = curr_style.get("cultural_context", {}).get("currency", "")
        exp_style = curr_style.get("explanation_style", {})
        video_hints = curr_style.get("video_prompt_hints", {})
        narration_tone = curr_style.get("narration_tone", "")
        curriculum_block = "\nCURRICULUM STYLE:\n"
        curriculum_block += f"- Curriculum: {curr_style.get('full_name', curriculum or 'nctb')}\n"
        if narration_tone:
            curriculum_block += f"- Narration tone: {narration_tone}\n"
        if metaphors:
            curriculum_block += f"- Preferred visual objects for {topic}: {', '.join(metaphors[:3])}\n"
        elif locale_examples:
            curriculum_block += f"- Use culturally familiar objects from: {', '.join(locale_examples[:4])}\n"
        if currency:
            curriculum_block += f"- Currency context: {currency}\n"
        if exp_style.get("primary_approach"):
            curriculum_block += f"- Explanation approach: {exp_style['primary_approach']}\n"
        if exp_style.get("story_context_hint"):
            curriculum_block += f"- Story context: {exp_style['story_context_hint']}\n"
        if video_hints.get("opening"):
            curriculum_block += f"- Video opening: {video_hints['opening']}\n"
        if video_hints.get("color_palette"):
            curriculum_block += f"- Color palette: {video_hints['color_palette']}\n"
    # ---------------------------------------------------------------------------

    # Adjust constraints based on whether a smaller example is forced
    if template == "column_arithmetic":
        scene_rules = (
            "- DO NOT create 'smaller starter examples'. Solve ONLY the exact problem provided.\n"
            "- Use as many scenes as needed: 1 setup + 1 per column + 1 result. Do NOT limit scenes.\n"
        )
    elif level_note:
        scene_rules = (
            "- Limit the total number of scenes to 5-7 maximum (Small Example -> Equation -> Main Problem -> Equation).\n"
            f"- CRITICAL: The smaller example MUST use the exact same math operation ({topic}) as the main problem. Do not explain {topic} using the wrong terminology.\n"
        )
    else:
        scene_rules = (
            "- DO NOT create 'smaller starter examples' or invent your own problems. Solve ONLY the exact problem provided.\n"
            "- Limit the total number of scenes to 3-4 maximum. A 3-scene video is best (Setup -> Action/Math -> Equation).\n"
        )

    is_symbol_explicit = bool(re.search(r"[\+\-\*xX/÷]", question))
    pedagogy_note_lines = [
        "PEDAGOGY & TIMING RULES:",
        "- Do NOT rush to the answer. The goal is to help children UNDERSTAND math, not memorize it.",
    ]
    
    if not is_symbol_explicit:
        pedagogy_note_lines.append(f"- Since there are no explicit symbols, you MUST explicitly state that we are doing {topic} by name (e.g. 'Since we are sharing equally, this is a division problem'). Explain the 'why' behind the math operation.")
        
    pedagogy_note_lines.extend([
        "- Do NOT use phrasing like 'secret code' or 'magic trick' for equations. Equations are just a way to write what we did visually.",
        "- Your narration dictates how long a scene stays on screen. To give visual animations time to play out, do not rush your words. You can use pauses (like commas or periods) when many items are appearing.",
    ])
    
    pedagogy_note = "\n".join(pedagogy_note_lines)

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
- DRAW_SHAPE: Emphasize geometric properties
- MEASURE: Show an animated ruler or clock
- BALANCE: Show variables on a balance scale
- PLOT_CHART: Render bar charts, pie charts or tallies
- JUMP_NUMBER_LINE: Show frogs/bunnies jumping on a number line
- SHOW_PLACE_VALUE: Emphasize Base-10 blocks grouped by 10s and 100s
- SHOW_COLUMN_ARITHMETIC: Show right-to-left columnar addition or subtraction

Available item_type includes basic shapes (BLOCK_SVG, STAR_SVG, COUNTER, PIE_CHART, BAR_CHART, COIN, NOTE, RULER, CLOCK, SHAPE_2D, SHAPE_3D, BASE10_BLOCK, TALLY_MARK, NUMBER_LINE) AND 50+ real-world curriculum objects: APPLE_SVG, BIRD_SVG, FOOTBALL_SVG, PEN_SVG, PENCIL_SVG, TREE_SVG, BOTTLE_SVG, CAR_SVG, RICKSHAW_SVG, FEATHER_SVG, JACKFRUIT_SVG, BOOK_SVG, FLOWER_SVG, MANGO_SVG, BRINJAL_SVG, BUS_SVG, BD_FLAG_SVG, MAGPIE_SVG, LILY_SVG, TIGER_SVG, BANANA_SVG, ROSE_SVG, LEAF_SVG, UMBRELLA_SVG, HILSA_FISH_SVG, BALLOON_SVG, PINEAPPLE_SVG, COCONUT_SVG, CARROT_SVG, WATER_GLASS_SVG, EGG_SVG, TEA_CUP_SVG, POMEGRANATE_SVG, RABBIT_SVG, CAT_SVG, HORSE_SVG, BOAT_SVG, MARBLE_SVG, CROW_SVG, PEACOCK_SVG, COCK_SVG, HEN_SVG, GUAVA_SVG, ELEPHANT_SVG, TOMATO_SVG, PALM_FRUIT_SVG, ICE_CREAM_SVG, WATERMELON_SVG, CAP_SVG, HAT_SVG, BUTTERFLY_SVG, CHOCOLATE_SVG, CHAIR_SVG, SLICED_WATERMELON_SVG.
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
{curriculum_block}
{topic_guidance}

Problem: {question}
Correct answer (must match): {verified_answer}

{level_note}

{pedagogy_note}

Rules:
- STRICT STORYBOARD: Do not repeat steps or jump back and forth. Follow a logical progression.
{scene_rules}
- Make sure narration matches the action perfectly.
"""

    # For standard templates, enforce a final SHOW_EQUATION scene.
    # But for continuous components (column_arithmetic, small_addition), the final scene
    # is handled natively within their own action types, so we don't force it.
    if template not in ["column_arithmetic", "small_addition"]:
        base_content += "- ALWAYS end with a SHOW_EQUATION scene showing the final answer to the main problem.\n"
        
    base_content += "- Return ONLY valid JSON matching the schema exactly.\n- No markdown. No extra text.\n"

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

def _build_topic_guidance(topic: str, verified_answer: str, template: str = "", question: str = "") -> str:
    # Template-level override: when the math engine routes to column_arithmetic,
    # force the LLM to use SHOW_COLUMN_ARITHMETIC regardless of topic name.
    if template == "column_arithmetic":
        return (
            "Topic guidance: This is a COLUMN ARITHMETIC problem. You MUST follow these rules:\n"
            "- EVERY scene MUST use action \"SHOW_COLUMN_ARITHMETIC\" (Do NOT use SHOW_EQUATION or ADD_ITEMS).\n"
            "- EVERY scene MUST include an \"equation\" field with the equation string (e.g., \"1234 + 55\").\n"
            "- Keep \"equation\" the SAME base string in every scene so the frontend can parse it.\n"
            "\n"
            "MANDATORY scene structure — ONE scene per column, do NOT combine columns:\n"
            "Scene 1 — Setup: Briefly state the problem. Example: 'Let us solve 3123 subtract 78.'\n"
            "\n"
            "For EACH column (ones, tens, hundreds, thousands...) create ONE separate scene.\n"
            "\n"
            "ADDITION narration:\n"
            "  'Now the ones column. 4 plus 3 is 7. We write 7.'\n"
            "  If carry: '4 plus 8 is 12. We write 2, and carry the 1 to the tens.'\n"
            "\n"
            "SUBTRACTION narration — GRADUATED DETAIL (very important):\n"
            "  The FIRST time borrowing happens (usually ones column), explain it FULLY:\n"
            "    'Now the ones column. 3 subtract 8. But 3 is smaller than 8, so we need to borrow.\n"
            "     We take 1 from the tens. The 2 in the tens becomes 1, and our 3 becomes 13.\n"
            "     Now, 13 subtract 8 is 5. We write 5.'\n"
            "\n"
            "  The SECOND time borrowing happens, be SHORTER — the child already understands:\n"
            "    'The tens column. 1 subtract 7. We need to borrow again.\n"
            "     11 subtract 7 is 4. We write 4.'\n"
            "\n"
            "  Any further borrowing, be BRIEF:\n"
            "    'The hundreds column. We borrowed, so it is now 9. 9 subtract 3 is 6.'\n"
            "\n"
            "  When NO borrowing is needed, keep it simple:\n"
            "    'The hundreds column. 4 subtract 0 is 4.'\n"
            "\n"
            "VOCABULARY RULES:\n"
            "- Use 'subtract' as the primary word. Occasionally say 'minus' or 'take away' for variety.\n"
            "- NEVER say 'negative' or 'equals negative'.\n"
            "- NEVER repeat the exact same sentence structure for every column. Vary your phrasing.\n"
            "- Each column should feel slightly different in rhythm and wording.\n"
            "- Sound natural and warm, like a patient teacher.\n"
            "\n"
            f"Final scene — Result: 'So, [num1] subtract [num2] is {verified_answer}.'\n"
            f"  equation field: include the answer, e.g. \"3123 - 78 = {verified_answer}\"\n"
            "\n"
            "CRITICAL RULES:\n"
            "- Do NOT rush. Each column gets its own dedicated scene.\n"
            "- Do NOT combine multiple columns into one scene.\n"
            "- Use pauses (commas, periods) to give animations time to play.\n"
            "- The equation field must stay the SAME in every scene (except final scene which adds = answer).\n"
        )
    if topic == "mcq":
        return (
            "Topic guidance: This is a MULTIPLE CHOICE question.\n"
            "\n"
            "MANDATORY scene structure — do not deviate:\n"
            "Scene 1 — SHOW_EQUATION: Show the question stem as the equation. Narration reads the question aloud, "
            "then introduces ALL options by number in order WITHOUT evaluating them yet. "
            "Example narration structure: 'Let us look at each option. Option 1 is [text]. Option 2 is [text]. "
            "Option 3 is [text]. Option 4 is [text]. Now let us check each one.'\n"
            "\n"
            "Scenes 2 to N — SHOW_EQUATION (ONE scene per option): Evaluate EVERY option in order, starting from "
            "Option 1. Even if the correct/incorrect answer is found early, CONTINUE and evaluate ALL remaining "
            "options so the student understands why each one is right or wrong. "
            "For each option scene: show the arithmetic or reasoning for that option as the equation, and in "
            "narration explain step by step whether it satisfies or does not satisfy the condition. "
            "Use plain language: 'Option 1. [work it out]. That gives [result]. [Yes, that is correct / "
            "No, that is NOT the answer].'\n"
            "\n"
            f"Final scene — SHOW_EQUATION: Clearly state '{verified_answer}' and in one sentence explain WHY "
            "that option is the correct/incorrect one compared to the others.\n"
            "\n"
            "CRITICAL RULES:\n"
            "- Evaluate every single option — never skip one.\n"
            "- Do NOT use ADD_ITEMS, REMOVE_ITEMS, or GROUP_ITEMS in any scene.\n"
            "- Only SHOW_EQUATION and HIGHLIGHT actions are allowed.\n"
            "- Do not invent example numbers from a different question. Use only the actual options given."
        )
    elif topic == "true_false":
        return (
            "Topic guidance: This is a TRUE or FALSE question. 3-scene structure:\n"
            "Scene 1 — SHOW_EQUATION: Show the statement as the equation. Read it aloud in narration.\n"
            "Scene 2 — SHOW_EQUATION: Work through the reasoning or calculation in narration step by step. "
            "Show the key arithmetic or logic as the equation.\n"
            f"Scene 3 — SHOW_EQUATION: State the answer '{verified_answer}' and explain in one sentence why.\n"
            "Do NOT use ADD_ITEMS, REMOVE_ITEMS, or GROUP_ITEMS."
        )
    elif topic == "multiplication":
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
        # Extract the starting value (A from A - B) to decide rendering approach
        _start_val = None
        _sub_val = None
        try:
            import re as _re
            # For subtraction word problems or equations finding the largest number
            _nums = _re.findall(r"\d+", str(question))
            if len(_nums) >= 2:
                _start_val = int(_nums[0])
                _sub_val = int(_nums[1])
                # In some word problems the numbers might be backwards, so just ensure start > sub if it's a basic subtraction
                if _sub_val > _start_val and "how many more" not in str(question).lower():
                    _start_val, _sub_val = _sub_val, _start_val
            elif _nums:
                _start_val = int(_nums[0])
        except Exception:
            pass

        _is_comparison = "how many more" in str(question).lower() or "than" in str(question).lower() or "difference" in str(question).lower()

        if _is_comparison and _start_val is not None and _start_val <= 20:
             return (
                "Topic guidance: This is a COMPARISON SUBTRACTION problem. Do NOT use SHOW_SMALL_SUBTRACTION because we are not taking items away, we are comparing two separate groups.\n"
                "Sequence MUST rigidly follow these steps in order:\n"
                "Step 1: 'ADD_ITEMS'. Show the first (larger) group. Narration e.g., 'Rafi has 6 flowers.'\n"
                "Step 2: 'ADD_ITEMS'. Show the second (smaller) group. Narration e.g., 'Tuly has 3 flowers.'\n"
                "Step 3: 'HIGHLIGHT'. Tell the user to match the items 1-to-1 to find the difference. Narration e.g., 'Let us match the flowers. The unmatched ones are the difference!'\n"
                "Step 4: 'SHOW_EQUATION'. Show the final subtraction equation. Narration e.g., '6 minus 3 equals 3 more flowers.'\n"
             )

        if _start_val is not None and _start_val <= 20:
            _zero_step = (
                "Step 2: 'SHOW_SMALL_SUBTRACTION'. We are taking away 0, so we do NOT remove anything. Narration e.g., 'We take away zero, which means we do not remove anything.' Equation MUST be 'Total - 0' (e.g., '8 - 0').\n"
                 if _sub_val == 0 else
                "Step 2: 'SHOW_SMALL_SUBTRACTION'. Take away the subtracted amount. Narration e.g., 'Now, we take away 3 items.' Equation MUST be 'Total - Remove' (e.g., '8 - 3').\n"
            )
            return (
                "Topic guidance: This is a SMALL TAKE-AWAY SUBTRACTION problem (starting amount ≤ 20). "
                "CRITICAL: You MUST rigidly return exactly 4 JSON scene elements in your array (unless sum < 6, then return 3). DO NOT merge steps.\n"
                "CRITICAL: Your narration MUST use the verbatim names/adjectives of the things from the question (e.g., '8 ripe mangoes'). NEVER use the generic words 'items' or 'objects'.\n"
                "Step 1: 'SHOW_SMALL_SUBTRACTION'. Show the total starting amount together. Narration e.g., 'Let us start with 8 ripe mangoes.' Equation MUST be 'Total - Remove' (e.g., '8 - 3').\n"
                f"{_zero_step}"
                "Step 3 (ONLY IF REMAINING IS 6 OR GREATER): 'SHOW_SMALL_SUBTRACTION'. Count the remaining objects. Narration e.g., 'Let's count what is left: 1, 2, 3...'. Equation MUST be 'Total - Remove' (e.g., '8 - 3'). Skip this step entirely if the remaining amount is less than 6. THIS MUST BE A SEPARATE SCENE FROM STEP 4.\n"
                "Step 4 (or Step 3 if skipped): 'SHOW_SMALL_SUBTRACTION'. Show the final answer. Narration e.g., 'So, 8 minus 3 leaves 5 mangoes.' Equation MUST be the full expression (e.g., '8 - 3 = 5').\n"
                "Pick an appropriate item_type based on the question (e.g., BIRD_SVG, APPLE_SVG, STAR_SVG, or BLOCK_SVG)."
            )
        
        return (
            "Topic guidance: Sequence MUST be:\n"
            "1. ADD_ITEMS first to show the starting count.\n"
            "2. REMOVE_ITEMS to take some away. IMPORTANT: You MUST set the equation field to exactly \"A - B\" (e.g., \"8 - 3\") so the frontend knows what to remove.\n"
            "3. SHOW_EQUATION to show the final result, e.g., \"8 - 3 = 5\".\n"
            "Pick an appropriate item_type based on the question (e.g., BIRD_SVG, APPLE_SVG, STAR_SVG, or BLOCK_SVG).\n"
            'Narration must mention "take away" or "remove".'
        )
    elif topic == "counting":
        return (
            "Topic guidance: Use ADD_ITEMS action.\n"
            "Show objects popping onto the screen one by one.\n"
            "Narrate the count synchronously with the visual appearance, e.g., 'One... Two... Three...'."
        )
    elif topic == "addition":  # route by sum size
        # Parse the sum from the verified answer to decide rendering approach
        # This gracefully handles word problems that don't have a "+" in the text.
        _sum_val = None
        try:
            import re as _re
            _nums = _re.findall(r"\d+", str(verified_answer))
            if _nums:
                _sum_val = int(_nums[0])
        except Exception:
            pass

        import re as _re
        is_decomp = _re.search(r"\b(\d+)\s+is\s+(\d+)\s+and\s+[?_]", question, _re.IGNORECASE) or _re.search(r"arrange\s+(\d+)\s+as\s+(\d+)\s+and\s+[?_]", question, _re.IGNORECASE)
        if is_decomp:
            return (
                "Topic guidance: This is a NUMBER DECOMPOSITION problem (e.g., '6 is 4 and 2'). "
                "Sequence MUST follow these steps closely.\n"
                "Step 1: 'ADD_ITEMS'. Show the total amount (e.g., 6 objects). Narration: 'Let us take 6 items.'\n"
                "Step 2: 'GROUP_ITEMS'. Split the objects into two distinct groups matching the parts. Narration: 'We can group them as 4 items and 2 items.'\n"
                "Step 3: 'SHOW_EQUATION'. Show the final decomposition. Equation MUST be 'Total = Part1 + Part2' (e.g., '6 = 4 + 2').\n"
                "Pick an appropriate item_type based on the question (e.g., BIRD_SVG, APPLE_SVG, STAR_SVG, or BLOCK_SVG)."
            )

        if _sum_val is not None and _sum_val <= 20:
            # Class 1 Ch.4 (concept, ≤10) and Ch.7 (11-20): animated grouped objects
            return (
                "Topic guidance: This is a SMALL ADDITION problem (sum ≤ 20). "
                "CRITICAL: You MUST rigidly return exactly 4 JSON scene elements in your array (unless sum < 6, then return 3). DO NOT merge steps.\n"
                "CRITICAL: Your narration MUST use the verbatim names/adjectives of the things from the question (e.g., '4 green mangoes and 3 ripe mangoes'). NEVER use the generic words 'items' or 'objects'.\n"
                "Step 1: 'SHOW_SMALL_ADDITION'. Show A + B. Narration e.g., 'Let us put 4 green mangoes and 3 ripe mangoes together.' Equation MUST simply be 'A + B' (e.g., '4 + 3').\n"
                "Step 2: 'SHOW_SMALL_ADDITION'. Merge groups. Narration e.g., 'When we add them all together...' Equation MUST be 'A + B' (e.g., '4 + 3').\n"
                "Step 3 (ONLY IF TOTAL SUM IS 6 OR GREATER): 'SHOW_SMALL_ADDITION'. Count the total. Narration e.g., 'Let us count them: 1, 2, 3...'. Equation MUST be 'A + B' (e.g., '4 + 3'). Skip this step entirely if the total is less than 6. THIS MUST BE A SEPARATE SCENE FROM STEP 4.\n"
                "Step 4 (or Step 3 if skipped): 'SHOW_SMALL_ADDITION'. Show the final answer. Narration e.g., 'So, there are 7 mangoes altogether.' Equation MUST be the full expression 'A + B = C' (e.g., '4 + 3 = 7').\n"
                "Pick an appropriate item_type based on the question (e.g., BIRD_SVG, APPLE_SVG, STAR_SVG, or BLOCK_SVG)."
            )
        else:
            # Class 1 Ch.15 (sums >20, up to 100): column arithmetic
            return (
                "Topic guidance: This is a LARGER ADDITION problem (sum > 20). You MUST follow these rules:\n"
                "- EVERY scene MUST use action \"SHOW_COLUMN_ARITHMETIC\".\n"
                "- EVERY scene MUST include an \"equation\" field with the equation string.\n"
                "Scene 1 — Setup: State the problem briefly.\n"
                "Scene per column (ones, then tens, etc.): show column-by-column addition.\n"
                "  If carrying: explain it simply — 'We write the ones digit and carry 1 to the tens.'\n"
                f"Final scene: 'So, the answer is {verified_answer}.' Include full equation with = answer.\n"
                "Sound warm and encouraging. Do NOT rush."
            )
    elif topic == "comparison":
        # Check if this is a qualitative comparison (Class 1 Ch.1)
        import re as _re
        if _re.search(r"\b(order|arrange|smaller to greater|greater to smaller)\b", question, _re.IGNORECASE) and len(_re.findall(r"\d+", question)) >= 2:
            return (
                "Topic guidance: This is a NUMBER ORDERING problem.\n"
                "Sequence MUST rigidly follow these steps in order. For ALL steps, use the action 'SHOW_NUMBER_ORDERING'.\n"
                "Step 1: 'SHOW_NUMBER_ORDERING'. Show the scrambled numbers on screen. Equation MUST be the scrambled list (e.g., '8, 3, 5, 2, 1'). Narration: 'We have 8, 3, 5, 2, 1.'\n"
                "Step 2 (Optional, use if transitioning is complex): 'SHOW_NUMBER_ORDERING'. Show intermediate sorting steps. Narration: 'Let us find the smallest number... it's 1. Then 2...' Equation MUST be the sorted list (e.g., '1, 2, 3, 5, 8').\n"
                "Step 3: 'SHOW_NUMBER_ORDERING'. Show the final sorted list clearly. Equation MUST be the final sorted list (e.g., '1, 2, 3, 5, 8'). Narration: 'So the correct order is 1, 2, 3, 5, 8.'"
            )
        elif _re.search(r"\b(heavier|lighter|heavy|light|weigh)\b", question, _re.IGNORECASE):
            return (
                "Topic guidance: This is a WEIGHT comparison. Sequence MUST be:\n"
                "1. ADD_ITEMS to show the two objects side-by-side (e.g., a feather and a book).\n"
                "2. BALANCE action: show them on a balance scale dipping towards the heavy side.\n"
                "3. SHOW_EQUATION or HIGHLIGHT to state the final answer (e.g. 'The book is heavier')."
            )
        elif _re.search(r"\b(taller|shorter|tall|short)\b", question, _re.IGNORECASE):
            return (
                "Topic guidance: This is a HEIGHT comparison. Sequence MUST be:\n"
                "1. ADD_ITEMS to show the two objects side-by-side on the same ground level.\n"
                "2. MEASURE action (or HIGHLIGHT): visually demonstrate which one reaches higher.\n"
                "3. SHOW_EQUATION to state the final answer."
            )
        elif _re.search(r"\b(farther|nearer|far|near|closer)\b", question, _re.IGNORECASE):
            return (
                "Topic guidance: This is a DISTANCE comparison. Sequence MUST be:\n"
                "1. ADD_ITEMS: Show a reference point (e.g., a tree) and the two objects at different distances.\n"
                "2. MEASURE action: Show a line or arrow indicating distance to each.\n"
                "3. SHOW_EQUATION to state the final answer."
            )
        elif _re.search(r"\b(bigger|smaller|larger|size)\b", question, _re.IGNORECASE):
            return (
                "Topic guidance: This is a SIZE comparison. Sequence MUST be:\n"
                "1. ADD_ITEMS to show the two objects side-by-side.\n"
                "2. HIGHLIGHT the larger or smaller one as asked.\n"
                "3. SHOW_EQUATION to state the final answer."
            )
        elif _re.search(r"\b(more|less|fewer)\b", question, _re.IGNORECASE) and "than" not in question.lower():
            return (
                "Topic guidance: This is a QUANTITY comparison (More/Less). Sequence MUST be:\n"
                "1. ADD_ITEMS to show the two groups of objects (e.g. two baskets of mangoes).\n"
                "2. HIGHLIGHT the group with more or less as asked.\n"
                "3. SHOW_EQUATION to state the final answer."
            )

        else:
            # Numeric comparison fallback
            return (
                "Topic guidance: This is a NUMERIC Comparison. Sequence MUST be:\n"
                "1. ADD_ITEMS to show two groups side-by-side. IMPORTANT: Set the equation field to exactly \"A ? B\" (e.g., \"5 ? 3\").\n"
                "2. HIGHLIGHT to emphasize the larger or smaller group based on the question. Set equation to \"A > B\" or \"A < B\".\n"
                "3. SHOW_EQUATION to state the final relationship (e.g., \"5 > 3\").\n"
                "If the problem is purely numeric and items don't make sense, just use SHOW_EQUATION."
            )
    elif topic == "number_properties":
        return (
            "Topic guidance: For Even/Odd questions, use SHOW_EVEN_ODD action.\n"
            "Narrate objects arranging in pairs and emphasize whether any are leftover (Odd) or not (Even)."
        )
    elif topic == "place_value":
        return (
            "Topic guidance: Use SHOW_PLACE_VALUE action.\n"
            "Show digits sliding into their respective columns (Ones, Tens, Hundreds, etc.).\n"
            "Narrate the place value of each digit clearly."
        )
    elif topic == "decimals":
        return (
            "Topic guidance: Use SHOW_COLUMN_ARITHMETIC action.\n"
            "Ensure the narration explicitly mentions aligning the decimal points vertically."
        )
    elif topic == "bodmas":
        return (
            "Topic guidance: Use SHOW_BODMAS action exclusively.\n"
            "Narrate step-by-step prioritizing brackets, then orders, then div/mult, then add/sub.\n"
            "Explain which part of the equation is being solved at each step."
        )
    elif topic == "factors_multiples":
        return (
            "Topic guidance: Use SHOW_EQUATION action.\n"
            "Narrate listing the factors or multiples for each number side-by-side.\n"
            "Highlight the common ones, then identify the Highest Common Factor or Lowest Common Multiple."
        )
    elif topic == "percentages":
        return (
            "Topic guidance: Use SHOW_PERCENTAGE action.\n"
            "Narrate visualizing a 100-square grid filling up to represent the percentage."
        )
    elif topic == "geometry":
        return (
            "Topic guidance: Use DRAW_SHAPE action.\n"
            "Mention the properties of the shape (sides, angles) in the narration."
        )
    elif topic == "patterns":
        # Check if it's a simple before/after/between sequence (Class 1 Ch.3)
        import re as _re
        is_simple_seq = _re.search(r"(next\s+number|previous|number before|between)", question, _re.IGNORECASE) or _re.search(r"[_\?]", question)
        if is_simple_seq and len(_re.findall(r"\d+", question)) <= 2:
            return (
                "Topic guidance: This is a MISSING NUMBER (Before/After/Between) problem. Sequence MUST be:\n"
                "1. SHOW_EQUATION: Display the given number(s) with a blank space (e.g. '_, 2' or '3, _, 5').\n"
                "2. SHOW_EQUATION: Fill in the blank with the correct number to show the counting sequence.\n"
                "Narrate the counting sequence clearly (e.g. 'One, Two, Three')."
            )
        else:
            return (
                "Topic guidance: This is a NUMBER PATTERN problem.\n"
                "Use SHOW_EQUATION action. Narrate the rule (e.g., 'adding 2 each time') and show the next number appearing."
            )
    elif topic == "averages":
        return (
            "Topic guidance: Use SHOW_EQUATION action.\n"
            "Sequence MUST be:\n"
            "1. Show the sum of all values.\n"
            "2. Show the sum being divided by the number of values to 'level them out'."
        )
    elif topic == "patterns":
        return (
            "Topic guidance: Use ADD_ITEMS to show the sequence, then HIGHLIGHT to show the pattern rule.\n"
            "Narrate how to find the next item by following the rule."
        )
    else:
        return (
            "Topic guidance: Choose the most appropriate action based on the problem type.\n"
            "- For problems involving counting or combining objects, use ADD_ITEMS with a context-appropriate item_type (e.g., BIRD_SVG, APPLE_SVG, BLOCK_SVG).\n"
            "- For problems involving comparison, place value, patterns, or conceptual reasoning, "
            "use SHOW_EQUATION scenes only — do NOT force ADD_ITEMS if items do not naturally represent the math.\n"
            "- Always end with a SHOW_EQUATION scene showing the final answer.\n"
            "Match the animation to the math: if items don't help explain it, skip them."
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


def _run_solve_and_render(
    question: str,
    grade: int,
    curriculum_hints: list[str] | None = None,
    pre_solved_answer: str | None = None,
    pre_solved_steps: list[str] | None = None,
    question_type: str | None = None,
    curriculum: str | None = None,
) -> SolveAndPromptResponse:
    """
    Full pipeline: solve → LLM script → cache check → TTS → Remotion render → cache.
    Returns a SolveAndPromptResponse with video_url populated.
    """
    # Step 1: Check cache first
    key = cache_key(question, grade)
    cached_filename = cache_lookup(key)
    if cached_filename:
        # Still need the solve data
        solve_result = _run_solve_and_prompt(
            question, grade,
            pre_solved_answer=pre_solved_answer,
            pre_solved_steps=pre_solved_steps,
            question_type=question_type,
        )
        solve_result.video_url = video_url_from_filename(cached_filename)
        solve_result.video_cached = True
        solve_result.video_generated_by = "remotion"
        logger.info(f"Cache HIT for '{question}' grade {grade}: {cached_filename}")
        return solve_result

    # Step 2: Run the full solve + LLM prompt pipeline
    solve_result = _run_solve_and_prompt(
        question, grade,
        curriculum_hints=curriculum_hints,
        curriculum=curriculum,
        pre_solved_answer=pre_solved_answer,
        pre_solved_steps=pre_solved_steps,
        question_type=question_type,
    )

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
