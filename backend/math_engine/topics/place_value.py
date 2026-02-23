"""
backend/math_engine/topics/place_value.py
Deterministic solver for place value questions.
"""
import re
from typing import Optional

# "What is the value of 7 in 472?" OR "value of digit 7 in 472"
DIGIT_VALUE_RE = re.compile(r"value of (?:digit\s+)?(\d+)\s+in\s+(\d+)", re.IGNORECASE)
# "expand 345" / "expanded form of 345" / "write 567 in expanded form"
EXPAND_RE = re.compile(
    r"(?:(?:expand|expanded\s+form\s+of)\s+(\d+)|(\d+)\s+in\s+expanded\s+form)",
    re.IGNORECASE,
)
# "how many tens in 473" / "digit in tens place of 473"
PLACE_QUERY_RE = re.compile(r"(?:tens|ones|hundreds|thousands)\s+(?:place|digit|in)\s+(\d+)|(\d+)\s+in\s+(?:tens|ones|hundreds|thousands)", re.IGNORECASE)
PLACE_NAMES = ["ones", "tens", "hundreds", "thousands", "ten-thousands"]


def _expanded_form(n: int) -> str:
    digits = str(n)
    parts = []
    for i, d in enumerate(digits):
        place = len(digits) - 1 - i
        val = int(d) * (10 ** place)
        if val > 0:
            parts.append(str(val))
    return " + ".join(parts) if parts else "0"


def _place_value_of_digit(digit: str, number: str) -> Optional[str]:
    """Find the place value of the FIRST occurrence of digit in number."""
    # Search from right
    rev = number[::-1]
    target = digit
    for i, ch in enumerate(rev):
        if ch == target:
            place = 10 ** i
            val = int(target) * place
            place_name = PLACE_NAMES[i] if i < len(PLACE_NAMES) else f"10^{i}"
            return f"{digit} is in the {place_name} place. Its value is {val}."
    return None


def solve_place_value(question: str) -> Optional[dict]:
    q = question.strip()

    # Digit value query
    m = DIGIT_VALUE_RE.search(q)
    if m:
        digit, number = m.group(1), m.group(2)
        explanation = _place_value_of_digit(digit, number)
        if explanation:
            # Find positional value
            rev = number[::-1]
            pos = next((i for i, ch in enumerate(rev) if ch == digit), None)
            place_name = PLACE_NAMES[pos] if pos is not None and pos < len(PLACE_NAMES) else "unknown"
            val = int(digit) * (10 ** pos) if pos is not None else 0
            return {
                "topic": "place_value",
                "answer": str(val),
                "steps": [
                    {"title": "Identify the digit", "text": f"The digit {digit} is in the number {number}."},
                    {"title": "Find its place", "text": f"Counting from the right: {digit} is in the {place_name} place."},
                    {"title": "Calculate its value", "text": f"{digit} × {10 ** pos} = {val}."},
                ],
                "smaller_example": "Smaller example: value of 4 in 45 → 40",
            }

    # Expanded form
    m2 = EXPAND_RE.search(q)
    if m2:
        # group(1) = number after 'expand'/'expanded form of'; group(2) = number before 'in expanded form'
        raw_n = m2.group(1) or m2.group(2)
        n = int(raw_n)
        expanded = _expanded_form(n)
        return {
            "topic": "place_value",
            "answer": expanded,
            "steps": [
                {"title": "Break the number", "text": f"Write each digit of {n} separately."},
                {"title": "Multiply by place value", "text": "Multiply each digit by its place value (ones=1, tens=10, hundreds=100...)."},
                {"title": "Write expanded form", "text": f"{n} = {expanded}."},
            ],
            "smaller_example": "Smaller example: 45 = 40 + 5",
        }

    return None
