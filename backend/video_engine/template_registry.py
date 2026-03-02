# backend/video_engine/template_registry.py

import json
from pathlib import Path
from typing import Any, Dict

# --------------------------------------------------------------------------
# Template alternatives
# Maps a math topic to available visual template variants.
# The UI / solver can use this to offer a "Try a different explanation" style.
# --------------------------------------------------------------------------
TEMPLATE_ALTERNATIVES = {
    "arithmetic_addition": ["column_arithmetic", "object_groups", "number_line"],
    "arithmetic_subtraction": ["column_arithmetic", "object_takeaway", "number_line"],
    "number_properties": ["even_odd_pairs", "division_remainder"],
    "percentages": ["grid_fill", "fraction_conversion"],
    "bodmas": ["bracket_first", "step_by_step_equation"]
}

def get_templates_for_topic(topic: str) -> list[str]:
    """
    Returns a list of template names available for a given topic.
    Always returns at least the topic name itself as a fallback.
    """
    return TEMPLATE_ALTERNATIVES.get(topic, [topic])


# --------------------------------------------------------------------------
# Curriculum style loader
# Reads curriculum_styles/{curriculum}.json and returns style metadata
# that the video prompt builder injects into the LLM prompt.
# --------------------------------------------------------------------------
_STYLES_DIR = Path(__file__).resolve().parent / "curriculum_styles"


def load_curriculum_style(curriculum: str) -> Dict[str, Any]:
    """
    Load the curriculum style descriptor for a given curriculum.

    Returns a dict with keys like:
      - full_name, country, language
      - cultural_context (currency, locale_examples, number_naming)
      - default_visual_metaphors_by_topic
      - explanation_style
      - video_prompt_hints

    Falls back to an empty dict if the curriculum style is not found.
    """
    key = (curriculum or "").strip().lower()
    if not key:
        return {}
    path = _STYLES_DIR / f"{key}.json"
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def get_visual_metaphors_for_topic(curriculum: str, topic: str) -> list[str]:
    """
    Convenience helper. Returns the list of preferred visual metaphors for a given
    curriculum + topic, used to guide the LLM's choice of objects in a video scene.
    Falls back to an empty list if not defined.
    """
    style = load_curriculum_style(curriculum)
    metaphors = style.get("default_visual_metaphors_by_topic", {})
    return metaphors.get(topic, [])

