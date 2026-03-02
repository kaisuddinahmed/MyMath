# backend/video_engine/template_registry.py

# Maps a math topic (or primary template) to a list of available alternative templates.
# The UI can use this to offer a "Try a different explanation" feature.
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
