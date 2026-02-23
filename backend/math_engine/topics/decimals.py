"""
backend/math_engine/topics/decimals.py
Deterministic solver for decimal operations.
"""
import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

# "3.5 + 2.4", "7.8 - 3.2"
DECIMAL_ARITH_RE = re.compile(r"(\d+\.\d+)\s*([+\-])\s*(\d+\.\d+)", re.IGNORECASE)
# "round 3.456 to 2 decimal places"
ROUND_RE = re.compile(r"round\s+(\d+\.\d+)\s+to\s+(\d+)\s+decimal", re.IGNORECASE)
# "what is 3.5 as a fraction"
AS_FRAC_RE = re.compile(r"(\d+\.\d+)\s+as\s+a\s+fraction", re.IGNORECASE)


def _round_decimal(val: Decimal, places: int) -> str:
    quantize = Decimal("0." + "0" * places) if places > 0 else Decimal("1")
    return str(val.quantize(quantize, rounding=ROUND_HALF_UP))


def solve_decimals(question: str) -> Optional[dict]:
    q = question.strip()

    # Arithmetic
    m = DECIMAL_ARITH_RE.search(q)
    if m:
        a = Decimal(m.group(1))
        op = m.group(2)
        b = Decimal(m.group(3))
        result = a + b if op == "+" else a - b
        result_str = str(result.normalize())
        verb = "add" if op == "+" else "subtract"
        return {
            "topic": "decimals",
            "answer": result_str,
            "steps": [
                {"title": "Line up decimal points", "text": f"Write {a} and {b} with decimal points aligned."},
                {"title": f"{verb.capitalize()}", "text": f"{a} {op} {b}."},
                {"title": "Answer", "text": f"{result_str}."},
            ],
            "smaller_example": "Smaller example: 1.5 + 2.3 = 3.8",
        }

    # Rounding
    m2 = ROUND_RE.search(q)
    if m2:
        val = Decimal(m2.group(1))
        places = int(m2.group(2))
        rounded = _round_decimal(val, places)
        return {
            "topic": "decimals",
            "answer": rounded,
            "steps": [
                {"title": "Identify rounding place", "text": f"We round {val} to {places} decimal place(s)."},
                {"title": "Look at the next digit", "text": f"The digit after the {places}th decimal place determines rounding."},
                {"title": "Answer", "text": f"{val} rounded to {places} decimal place(s) = {rounded}."},
            ],
            "smaller_example": "Smaller example: 3.456 rounded to 2 decimal places = 3.46",
        }

    return None
