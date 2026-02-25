"""
backend/math_engine/grade_style.py
Grade-adaptive style loader. Controls vocabulary, pace, and visual preferences.
Grade/age shapes HOW things are explained — not WHETHER they are answered.
"""
from backend.core.config import GRADE_STYLE, TOPIC_MAP


def get_grade_style(grade: int) -> dict:
    return GRADE_STYLE.get(str(grade), GRADE_STYLE.get("3", {
        "max_seconds": 60,
        "sentence_length": "short",
        "pace": "medium",
        "vocab": "simple",
    }))


def topic_level_note(topic: str, grade: int) -> str:
    """
    Returns a note for the LLM when the topic is advanced for the child's grade.
    This is a STYLE HINT only — it does not block answering the question.
    """
    info = TOPIC_MAP.get(topic)
    if not info:
        return ""
    min_g = int(info.get("min_grade", 1))
    if grade >= min_g:
        return ""
    return (
        f"This topic is usually taught in grade {min_g}. "
        f"Explain the core concept gently for grade {grade}. "
        "Use a smaller-number example first."
    )
