from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional
from backend.llm import get_client, get_model
from backend.config import TOPIC_MAP, GRADE_STYLE, TOPIC_KEYWORDS, load_json
from backend.coverage import coverage_report
from backend.problem_extractor import extract_math_problem_from_upload
from jsonschema import validate, ValidationError
from pathlib import Path
from datetime import datetime, timezone
import json
import random
import re
import uuid

app = FastAPI(title="MyMath API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
CHILDREN = {}  # child_id -> profile dict
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
ACTIVITY_FILE = DATA_DIR / "activity_log.json"
VIDEO_OUTPUT_DIR = BASE_DIR / "video_engine" / "output"
VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/videos", StaticFiles(directory=str(VIDEO_OUTPUT_DIR)), name="videos")


# -----------------------------
# Models
# -----------------------------
Grade = Literal[1, 2, 3, 4, 5]

class SolveRequest(BaseModel):
    grade: Grade = Field(..., description="Primary grade level (1-5)")
    question: str = Field(..., min_length=1, max_length=300, description="Math question in plain text")

class ChildProfileCreate(BaseModel):
    child_name: str
    age: int = Field(..., ge=4, le=12)
    class_level: int = Field(..., ge=1, le=5)

class ChildProfile(BaseModel):
    child_id: str
    child_name: str
    age: int
    class_level: int

class ActivityRecord(BaseModel):
    child_id: str
    question: str
    topic: str
    template: str
    score: int
    timestamp: str

class SolveByChildRequest(BaseModel):
    child_id: str
    question: str

class Step(BaseModel):
    title: str
    text: str

class SolveResponse(BaseModel):
    topic: str
    answer: str
    steps: List[Step]
    smaller_example: str


class PromptAttempt(BaseModel):
    attempt: int
    prompt: str
    checks: dict
    score: int
    passed: bool

class ReviewSummary(BaseModel):
    concept: str
    objects_used: str
    prerequisite_used: str
    common_mistake: str


class SolveAndPromptResponse(BaseModel):
    topic: str
    verified_answer: str
    verified_steps: List[Step]
    template: str
    min_grade_for_topic: int
    is_above_grade: bool
    review: ReviewSummary
    attempts: List[PromptAttempt]
    final_prompt: str
    final_passed: bool
    final_score: int
    video_prompt_json: Optional[Dict[str, Any]]
    schema_valid: bool

class RenderVideoRequest(BaseModel):
    video_prompt_json: Dict[str, Any]
    output_name: str = "output.mp4"

class RenderVideoResponse(BaseModel):
    output_path: str
    output_url: str
    duration_seconds: int
    used_template: str
    audio_generated: bool


class GeometryParseSummary(BaseModel):
    analysis_available: bool
    has_diagram: bool
    line_segments: int
    circles: int
    parallel_pairs: int
    perpendicular_pairs: int
    point_labels: List[str]
    shape_hints: List[str]


class ExtractProblemResponse(BaseModel):
    question: str
    extracted_text: str
    source_type: Literal["image", "pdf"]
    ocr_engine: str
    confidence: float
    geometry: GeometryParseSummary
    notes: List[str]


# -----------------------------
# Helpers (MVP: add/sub + mul/div)
# -----------------------------
ADD_SUB_RE = re.compile(r"^\s*(\d{1,4})\s*([+\-])\s*(\d{1,4})\s*$")
MUL_DIV_RE = re.compile(r"^\s*(\d{1,4})\s*([xX*÷/])\s*(\d{1,4})\s*$")

def detect_topic(question: str) -> str:
    m = ADD_SUB_RE.match(question)
    if m:
        return "addition" if m.group(2) == "+" else "subtraction"

    m2 = MUL_DIV_RE.match(question)
    if m2:
        op = m2.group(2)
        return "multiplication" if op in ["x", "X", "*"] else "division"

    return "unknown"

def detect_topic_with_keywords(question: str) -> str:
    q = question.lower()

    # Exact regex-based math first (most reliable)
    m = ADD_SUB_RE.match(question)
    if m:
        return "addition" if m.group(2) == "+" else "subtraction"

    m2 = MUL_DIV_RE.match(question)
    if m2:
        op = m2.group(2)
        return "multiplication" if op in ["x", "X", "*"] else "division"

    # Keyword-based fallback (for word problems later)
    for topic, keys in TOPIC_KEYWORDS.items():
        for k in keys:
            if k.lower() in q:
                return topic

    return "unknown"

def solve_add_sub(question: str):
    m = ADD_SUB_RE.match(question)
    if not m:
        return None
    a = int(m.group(1))
    op = m.group(2)
    b = int(m.group(3))
    ans = a + b if op == "+" else a - b
    return a, op, b, ans

def solve_mul_div(question: str):
    m = MUL_DIV_RE.match(question)
    if not m:
        return None
    a = int(m.group(1))
    op = m.group(2)
    b = int(m.group(3))
    if op in ["x", "X", "*"]:
        ans = a * b
        return a, op, b, ans
    else:
        # For MVP: only support exact division
        if b == 0 or a % b != 0:
            return a, op, b, None
        ans = a // b
        return a, op, b, ans

def build_steps(grade: int, a: int, op: str, b: int, ans: int) -> List[Step]:
    # Keep language short and simple for primary levels
    if op == "+":
        return [
            Step(title="What we need to do", text=f"We add {a} and {b}."),
            Step(title="Count on", text=f"Start at {a}. Count up {b} times."),
            Step(title="Result", text=f"After counting up {b} times, we get {ans}.")
        ]
    if op == "-":
        return [
            Step(title="What we need to do", text=f"We subtract {b} from {a}."),
            Step(title="Count back", text=f"Start at {a}. Count back {b} times."),
            Step(title="Result", text=f"After counting back {b} times, we get {ans}.")
        ]
    if op in ["x", "X", "*"]:
        return [
            Step(title="What it means", text=f"{a} × {b} means {a} groups of {b}."),
            Step(title="Make groups", text=f"Make {a} groups. Put {b} counters in each group."),
            Step(title="Count all", text=f"Count all counters. Total is {ans}.")
        ]
    if op in ["÷", "/"]:
        return [
            Step(title="What it means", text=f"{a} ÷ {b} means sharing {a} items equally into {b} groups."),
            Step(title="Share equally", text=f"Share the {a} counters into {b} groups."),
            Step(title="Count in one group", text=f"Each group gets {ans}.")
        ]

    return [Step(title="Not supported yet", text="Try a question like: 12 + 5")]

def build_smaller_example(op: str) -> str:
    if op == "+":
        return "Smaller example: 5 + 2 = 7"
    if op == "-":
        return "Smaller example: 7 - 2 = 5"
    if op in ["x", "X", "*"]:
        return "Smaller example: 3 x 2 = 6"
    if op in ["÷", "/"]:
        return "Smaller example: 8 ÷ 2 = 4"
    return "Smaller example: 5 + 2 = 7"

def pick_template(topic: str) -> str:
    info = TOPIC_MAP.get(topic)
    if not info:
        return "generic"
    return random.choice(info.get("templates", ["generic"]))

def get_grade_style(grade: int) -> dict:
    return GRADE_STYLE.get(str(grade), GRADE_STYLE.get("3", {
        "max_seconds": 60,
        "sentence_length": "short",
        "pace": "medium",
        "vocab": "simple"
    }))

def topic_level_note(topic: str, grade: int) -> str:
    info = TOPIC_MAP.get(topic)
    if not info:
        return ""
    min_g = int(info.get("min_grade", 1))
    if grade >= min_g:
        return ""
    prereq = info.get("prerequisites", [])
    prereq_text = ", ".join(prereq) if prereq else "basics"
    return (
        f"This topic is usually taught in grade {min_g}. "
        f"Explain gently for grade {grade} by first teaching prerequisites: {prereq_text}. "
        "Use a smaller-number example first."
    )

def review_summary(topic: str, template: str, is_above: bool, prereqs: list) -> ReviewSummary:
    concept_map = {
        "addition": "Adding means putting groups together.",
        "subtraction": "Subtracting means taking away.",
        "multiplication": "Multiplication means equal groups.",
        "division": "Division means sharing equally.",
        "fractions": "Fractions mean equal parts of a whole.",
        "place_value": "Digits have values based on place."
    }
    obj_map = {
        "counters_add": "counters/blocks",
        "counters_remove": "counters/blocks",
        "group_boxes": "group boxes + counters",
        "sharing_groups": "shared counters into groups",
        "fraction_pie": "fraction pie (equal slices)",
        "fraction_bar": "fraction bar (equal parts)"
    }
    mistake_map = {
        "addition": "Counting too many or skipping a number.",
        "subtraction": "Counting back the wrong number of steps.",
        "multiplication": "Making unequal groups.",
        "division": "Not sharing equally across groups.",
        "fractions": "Making parts that are not equal."
    }

    prereq_text = ", ".join(prereqs) if (is_above and prereqs) else ""
    return ReviewSummary(
        concept=concept_map.get(topic, "Explain the main idea simply."),
        objects_used=obj_map.get(template, "simple objects"),
        prerequisite_used=prereq_text if prereq_text else "none",
        common_mistake=mistake_map.get(topic, "Mixing up steps.")
    )

VIDEO_SCHEMA = load_json("video_prompt_schema.json")

VIDEO_PROMPT_CONTRACT = """You MUST return ONLY valid JSON matching this schema.
No explanations. No markdown. No extra text.
All object counts must match the math exactly.
"""

def validate_video_prompt(json_text: str):
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as exc:
        return False, None, f"Invalid JSON: {exc.msg}"

    if not isinstance(data, dict):
        return False, None, "Top-level JSON must be an object."

    try:
        validate(instance=data, schema=VIDEO_SCHEMA or {})
    except ValidationError as exc:
        return False, data, f"Schema validation failed: {exc.message}"

    return True, data, ""

def run_prompt_checks(
    prompt_text: str,
    verified_answer: str,
    topic: str,
    schema_valid: bool,
    prompt_json: Optional[Dict[str, Any]]
) -> dict:
    text = prompt_text or ""
    lower_text = text.lower()
    lower = json.dumps(prompt_json, ensure_ascii=False).lower() if prompt_json else lower_text

    mentions_objects = any(k in lower for k in ["counters", "blocks", "coins", "objects"])
    mentions_objects_first = ("objects first" in lower) or ("show objects" in lower) or ("counters" in lower)
    mentions_practical_example = "practical example" in lower or "real-life" in lower or "example" in lower
    mentions_fraction_visual = any(k in lower for k in ["pie", "bar", "slice"])
    mentions_groups_word = "group" in lower
    mentions_share_word = "share" in lower or "sharing" in lower
    mentions_equal_parts = "equal parts" in lower
    includes_correct_answer = str(verified_answer).lower() in lower

    hard_topic_ok = True
    hard_topic_rule = "none"

    if topic in ["addition", "subtraction"]:
        hard_topic_rule = 'narration must mention "counters" or "blocks"'
        hard_topic_ok = any(k in lower for k in ["counters", "blocks"])
    elif topic == "multiplication":
        hard_topic_rule = 'narration must mention "groups"'
        hard_topic_ok = "group" in lower
    elif topic == "division":
        hard_topic_rule = 'narration must mention "share"'
        hard_topic_ok = "share" in lower or "sharing" in lower
    elif topic == "fractions":
        hard_topic_rule = 'narration must mention "equal parts"'
        hard_topic_ok = "equal parts" in lower

    return {
        "schema_valid": schema_valid,
        "mentions_objects": mentions_objects,
        "mentions_objects_first": mentions_objects_first,
        "mentions_practical_example": mentions_practical_example,
        "mentions_fraction_visual": mentions_fraction_visual,
        "mentions_groups_word": mentions_groups_word,
        "mentions_share_word": mentions_share_word,
        "mentions_equal_parts": mentions_equal_parts,
        "includes_correct_answer": includes_correct_answer,
        "hard_topic_rule": hard_topic_rule,
        "hard_topic_ok": hard_topic_ok,
    }

def checks_pass(checks: dict) -> bool:
    return all([
        checks.get("schema_valid"),
        checks.get("includes_correct_answer"),
        checks.get("hard_topic_ok"),
    ])

def prompt_score(topic: str, checks: dict) -> int:
    score = 0
    weights = {
        "schema_valid": 35,
        "includes_correct_answer": 25,
        "hard_topic_ok": 20,
        "mentions_objects": 10,
        "mentions_practical_example": 10,
    }
    for k, w in weights.items():
        if checks.get(k):
            score += w

    if topic == "multiplication":
        score += 5 if checks.get("mentions_groups_word") else 0
    if topic == "division":
        score += 5 if checks.get("mentions_share_word") else 0
    if topic == "fractions":
        score += 5 if checks.get("mentions_fraction_visual") else 0

    return min(score, 100)

def load_activity_records() -> List[dict]:
    if not ACTIVITY_FILE.exists():
        return []
    raw = ACTIVITY_FILE.read_text(encoding="utf-8").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []

def save_activity_records(records: List[dict]) -> None:
    ACTIVITY_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

def append_activity_record(child_id: str, question: str, topic: str, template: str, score: int) -> None:
    records = load_activity_records()
    records.append({
        "child_id": child_id,
        "question": question,
        "topic": topic,
        "template": template,
        "score": int(score),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    save_activity_records(records[-300:])  # keep bounded recent history


# -----------------------------
# Routes
# -----------------------------
@app.get("/")
def read_root():
    return {"message": "MyMath Backend Running"}

@app.get("/coverage")
def get_coverage():
    return coverage_report()

@app.get("/activity", response_model=List[ActivityRecord])
def get_activity(child_id: Optional[str] = None, limit: int = 20):
    records = load_activity_records()
    if child_id:
        records = [r for r in records if r.get("child_id") == child_id]
    limit = max(1, min(limit, 200))
    return records[-limit:][::-1]


@app.post("/extract-problem", response_model=ExtractProblemResponse)
async def extract_problem_endpoint(request: Request):
    try:
        form = await request.form()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not parse uploaded form data. Send multipart/form-data with field 'file'. "
                "If server dependency is missing, install: python-multipart."
            ),
        )

    file = form.get("file")
    if file is None:
        raise HTTPException(status_code=400, detail="Missing file field. Use form field name 'file'.")

    filename = getattr(file, "filename", None) or "upload"
    content_type = getattr(file, "content_type", None) or ""
    read_fn = getattr(file, "read", None)
    if read_fn is None:
        raise HTTPException(status_code=400, detail="Invalid upload object.")

    try:
        file_bytes = await read_fn()
    except TypeError:
        file_bytes = read_fn()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {exc}")

    if not isinstance(file_bytes, (bytes, bytearray)):
        raise HTTPException(status_code=400, detail="Uploaded file content is invalid.")

    try:
        parsed = extract_math_problem_from_upload(
            file_bytes=bytes(file_bytes),
            filename=filename,
            content_type=content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")

    return ExtractProblemResponse(**parsed)

@app.post("/render-video", response_model=RenderVideoResponse)
def render_video_endpoint(req: RenderVideoRequest):
    try:
        validate(instance=req.video_prompt_json, schema=VIDEO_SCHEMA or {})
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid video JSON: {exc.message}")

    try:
        from backend.video_engine.renderer import render_video
        result = render_video(req.video_prompt_json, req.output_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Render failed: {exc}")

    return RenderVideoResponse(
        output_path=result["output_path"],
        output_url=f"/videos/{Path(result['output_path']).name}",
        duration_seconds=int(result["duration_seconds"]),
        used_template=str(result.get("used_template", "")),
        audio_generated=bool(result.get("audio_generated", False)),
    )

@app.get("/children", response_model=List[ChildProfile])
def list_children():
    return list(CHILDREN.values())

@app.post("/children", response_model=ChildProfile)
def create_child(profile: ChildProfileCreate):
    child_id = str(uuid.uuid4())
    data = {
        "child_id": child_id,
        "child_name": profile.child_name,
        "age": profile.age,
        "class_level": profile.class_level
    }
    CHILDREN[child_id] = data
    return data

@app.get("/children/{child_id}", response_model=ChildProfile)
def get_child(child_id: str):
    if child_id not in CHILDREN:
        raise HTTPException(status_code=404, detail="Child not found")
    return CHILDREN[child_id]

@app.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    topic = detect_topic_with_keywords(req.question)

    solved = solve_add_sub(req.question)
    if not solved:
        solved = solve_mul_div(req.question)

    if not solved:
        return SolveResponse(
            topic=topic,
            answer="(MVP supports +, -, x, ÷ with simple forms like: 12 + 5, 18 - 7, 4 x 3, 12 ÷ 3)",
            steps=[Step(title="Not supported yet", text="Try a question like: 12 + 5, 4 x 3, or 12 ÷ 3")],
            smaller_example="Smaller example: 5 + 2 = 7"
        )

    a, op, b, ans = solved
    if ans is None:
        return SolveResponse(
            topic=topic,
            answer="(MVP currently supports only exact division. Try exact division like 12 ÷ 3.)",
            steps=[Step(title="Not supported yet", text="Try exact division like 12 ÷ 3.")],
            smaller_example="Smaller example: 8 ÷ 2 = 4"
        )

    steps = build_steps(req.grade, a, op, b, ans)
    return SolveResponse(
        topic=topic,
        answer=str(ans),
        steps=steps,
        smaller_example=build_smaller_example(op)
    )

@app.post("/solve-and-video-prompt", response_model=SolveAndPromptResponse)
def solve_and_video_prompt(req: SolveRequest):
    topic = detect_topic_with_keywords(req.question)
    template = pick_template(topic)
    info = TOPIC_MAP.get(topic, {})
    min_grade_for_topic = int(info.get("min_grade", 1))
    is_above_grade = req.grade < min_grade_for_topic
    prereqs = info.get("prerequisites", []) if isinstance(info.get("prerequisites", []), list) else []
    review = review_summary(topic, template, is_above_grade, prereqs)

    solved = solve_add_sub(req.question)
    if not solved:
        solved = solve_mul_div(req.question)

    if not solved:
        return SolveAndPromptResponse(
            topic=topic,
            verified_answer="(MVP supports +, -, x, ÷ with simple forms like: 12 + 5, 18 - 7, 4 x 3, 12 ÷ 3)",
            verified_steps=[Step(title="Not supported yet", text="Try a question like: 12 + 5, 4 x 3, or 12 ÷ 3")],
            template=template,
            min_grade_for_topic=min_grade_for_topic,
            is_above_grade=is_above_grade,
            review=review,
            attempts=[],
            final_prompt="{}",
            final_passed=False,
            final_score=0,
            video_prompt_json=None,
            schema_valid=False,
        )

    a, op, b, ans = solved
    if topic == "division" and ans is None:
        return SolveAndPromptResponse(
            topic=topic,
            verified_answer="(MVP currently supports only exact division. Try exact division like 12 ÷ 3.)",
            verified_steps=[Step(title="Not supported yet", text="Try exact division like 12 ÷ 3.")],
            template=template,
            min_grade_for_topic=min_grade_for_topic,
            is_above_grade=is_above_grade,
            review=review,
            attempts=[],
            final_prompt="{}",
            final_passed=False,
            final_score=0,
            video_prompt_json=None,
            schema_valid=False,
        )

    steps = build_steps(req.grade, a, op, b, ans)

    # Call LLM to generate the video prompt (but do NOT trust it for math correctness)
    client = get_client()
    model = get_model()
    style = get_grade_style(req.grade)
    level_note = topic_level_note(topic, req.grade)

    schema_text = json.dumps(VIDEO_SCHEMA or {}, ensure_ascii=True)

    topic_rule = "Use clear, concrete visuals with exact object counts."
    hard_rule = 'Narration must mention "counters" or "blocks".'
    if topic == "multiplication":
        topic_rule = f"Use visuals with group boxes: show exactly {a} groups with {b} counters each."
        hard_rule = 'Narration must mention "groups".'
    elif topic == "division":
        topic_rule = f"Use sharing visuals: distribute {a} counters equally into {b} groups. Show the sharing step clearly."
        hard_rule = 'Narration must mention "share".'
    elif topic == "fractions":
        topic_rule = "Use fraction pie or chocolate bar visuals. Show splitting into equal parts first, then selecting one part."
        hard_rule = 'Narration must mention "equal parts".'

    base_user_content = f"""
Generate a video prompt for this primary math problem as STRICT JSON.

Schema:
{schema_text}

Grade: {req.grade}
Topic: {topic}
Template: {template}
Max duration seconds: {style["max_seconds"]}
Sentence length: {style["sentence_length"]}
Pace: {style["pace"]}
Vocabulary: {style["vocab"]}
Topic rule: {topic_rule}
Hard requirement: {hard_rule}

Problem: {req.question}
Correct answer (must match): {ans}

{level_note}

Important: return ONLY valid JSON matching the schema exactly.
No markdown. No extra text.
Use the exact correct answer and exact object counts.
"""

    attempts = []
    final_prompt = ""
    final_passed = False
    final_score = 0
    final_prompt_json = None
    final_schema_valid = False

    for attempt in [1, 2]:
        user_content = base_user_content
        if attempt == 2:
            user_content += """
Retry with stricter enforcement:
- If JSON is invalid or schema fields are missing, your answer is invalid.
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
        checks = run_prompt_checks(prompt_text, str(ans), topic, schema_valid, prompt_json)

        failure_reason = ""
        if validation_error:
            failure_reason = validation_error
        elif not checks.get("includes_correct_answer"):
            failure_reason = "Missing verified answer in JSON output."
        elif not checks.get("hard_topic_ok"):
            failure_reason = f"Hard topic check failed: {checks.get('hard_topic_rule')}"

        if failure_reason:
            checks["failure_reason"] = failure_reason

        score = prompt_score(topic, checks)
        passed = checks_pass(checks)

        attempts.append(PromptAttempt(
            attempt=attempt,
            prompt=prompt_text,
            checks=checks,
            score=score,
            passed=passed
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
        verified_answer=str(ans),
        verified_steps=steps,
        template=template,
        min_grade_for_topic=min_grade_for_topic,
        is_above_grade=is_above_grade,
        review=review,
        attempts=attempts,
        final_prompt=final_prompt,
        final_passed=final_passed,
        final_score=final_score,
        video_prompt_json=final_prompt_json,
        schema_valid=final_schema_valid,
    )

@app.post("/solve-and-video-prompt/by-child", response_model=SolveAndPromptResponse)
def solve_and_video_prompt_by_child(req: SolveByChildRequest):
    child = CHILDREN.get(req.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Reuse existing logic by creating SolveRequest with class_level as grade
    solve_req = SolveRequest(grade=child["class_level"], question=req.question)
    result = solve_and_video_prompt(solve_req)
    append_activity_record(
        child_id=req.child_id,
        question=req.question,
        topic=result.topic,
        template=result.template,
        score=result.final_score,
    )
    return result
