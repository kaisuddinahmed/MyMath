"""
backend/math_engine/topics/measurement.py
Deterministic solver for measurement and unit conversion.
"""
import re
from typing import Optional

# Unit conversion tables
LENGTH = {
    # to metres
    "km": 1000, "m": 1, "cm": 0.01, "mm": 0.001,
    "kilometre": 1000, "metre": 1, "centimetre": 0.01, "millimetre": 0.001,
    "kilometres": 1000, "metres": 1, "centimetres": 0.01, "millimetres": 0.001,
}
WEIGHT = {
    # to grams
    "kg": 1000, "g": 1,
    "kilogram": 1000, "gram": 1, "kilograms": 1000, "grams": 1,
}
VOLUME = {
    # to millilitres
    "l": 1000, "ml": 1, "litre": 1000, "millilitre": 1,
    "litres": 1000, "millilitres": 1,
}
TIME = {
    # to minutes
    "hour": 60, "hours": 60, "hr": 60, "h": 60,
    "minute": 1, "minutes": 1, "min": 1,
    "second": 1/60, "seconds": 1/60, "sec": 1/60, "s": 1/60,
    "day": 1440, "days": 1440,
    "week": 10080, "weeks": 10080,
}

# "convert 3 km to metres", "change 500 cm to m"
CONVERT_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(km|m|cm|mm|kg|g|l|ml|hour|hours|hr|minute|minutes|min|second|seconds|sec|day|days|week|weeks|kilometre|metre|centimetre|millimetre|kilogram|gram|litre|millilitre|kilometres|metres|centimetres|millimetres|kilograms|grams|litres|millilitres)\s+(?:to|into|in)\s+(km|m|cm|mm|kg|g|l|ml|hour|hours|hr|minute|minutes|min|second|seconds|sec|day|days|week|weeks|kilometre|metre|centimetre|millimetre|kilogram|gram|litre|millilitre|kilometres|metres|centimetres|millimetres|kilograms|grams|litres|millilitres)",
    re.IGNORECASE,
)
# "how many grams in 3 kg", "how many cm are in 2 m"
_UNITS_PAT = r"km|m|cm|mm|kg|g|l|ml|hour|hours|hr|minute|minutes|min|second|seconds|sec|day|days|week|weeks|kilometre|metre|centimetre|millimetre|kilogram|gram|litre|millilitre|kilometres|metres|centimetres|millimetres|kilograms|grams|litres|millilitres"
HOW_MANY_RE = re.compile(
    rf"how many\s+({_UNITS_PAT})\s+(?:are\s+)?(?:in|is|there\s+in)\s+(\d+(?:\.\d+)?)\s+({_UNITS_PAT})",
    re.IGNORECASE,
)


def _get_table(unit: str):
    u = unit.lower()
    if u in LENGTH: return LENGTH, "metres"
    if u in WEIGHT: return WEIGHT, "grams"
    if u in VOLUME: return VOLUME, "millilitres"
    if u in TIME: return TIME, "minutes"
    return None, None


def solve_measurement(question: str) -> Optional[dict]:
    q = question.strip()

    # Form 1: "3 km to metres" / "500 cm into m"
    m = CONVERT_RE.search(q)
    if m:
        value = float(m.group(1))
        from_unit = m.group(2).lower()
        to_unit = m.group(3).lower()
    else:
        # Form 2: "how many grams in 3 kg" (reversed order)
        m2 = HOW_MANY_RE.search(q)
        if not m2:
            return None
        to_unit = m2.group(1).lower()
        value = float(m2.group(2))
        from_unit = m2.group(3).lower()
        m = None  # signal we came from form 2

    table_from, base_name = _get_table(from_unit)
    table_to, _ = _get_table(to_unit)

    if not table_from or not table_to or table_from is not table_to:
        return None

    from_rate = table_from.get(from_unit)
    to_rate = table_to.get(to_unit)
    if not from_rate or not to_rate:
        return None

    in_base = value * from_rate
    result = in_base / to_rate

    result_str = str(int(result)) if result == int(result) else f"{result:.4f}".rstrip("0").rstrip(".")

    return {
        "topic": "measurement",
        "answer": f"{result_str} {to_unit}",
        "steps": [
            {"title": "Identify the conversion", "text": f"We need to convert {value} {from_unit} to {to_unit}."},
            {"title": "Convert to base unit", "text": f"{value} {from_unit} = {value * from_rate} {base_name}."},
            {"title": "Convert to target unit", "text": f"{value * from_rate} {base_name} ÷ {to_rate} = {result_str} {to_unit}."},
        ],
        "smaller_example": f"Smaller example: 1 km = 1000 m",
    }
