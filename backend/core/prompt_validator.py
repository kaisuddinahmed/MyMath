"""
backend/core/prompt_validator.py — LLM video prompt validation and scoring.
Validates schema, runs topic-specific hard checks, and scores each attempt.
"""
import json
from pathlib import Path
from typing import Any, Dict, Optional
from jsonschema import validate, ValidationError

BASE_DIR = Path(__file__).resolve().parent.parent

def _load_schema():
    path = BASE_DIR / "video_prompt_schema.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

VIDEO_SCHEMA = _load_schema()

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
    prompt_json: Optional[Dict[str, Any]],
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
