"""
backend/math_engine/topics/fractions.py
Deterministic solver for fractions.
Handles: N/D of whole, fraction recognition, add/sub same-denom, compare fractions.
"""
import re
from math import gcd
from typing import Optional, Tuple

# "1/2 of 8", "3/4 of 20", "2/3 of 12"
FRACTION_OF_RE = re.compile(r"(\d+)\s*/\s*(\d+)\s+of\s+(\d+)", re.IGNORECASE)
# "1/2 + 1/2", "3/4 - 1/4" (same denominator)
FRACTION_ADD_SUB_RE = re.compile(r"(\d+)\s*/\s*(\d+)\s*([+\-])\s*(\d+)\s*/\s*(\d+)", re.IGNORECASE)
# "which is bigger: 3/4 or 1/2", "is 2/3 > 1/2"
FRACTION_COMPARE_RE = re.compile(r"(\d+)\s*/\s*(\d+)\s*(?:vs\.?|or|>|<|compare|bigger|smaller)", re.IGNORECASE)


def _simplify(num: int, den: int) -> Tuple[int, int]:
    if den == 0:
        return num, den
    common = gcd(abs(num), abs(den))
    return num // common, den // common


def solve_fractions(question: str) -> Optional[dict]:
    q = question.strip()

    # N/D of whole
    m = FRACTION_OF_RE.search(q)
    if m:
        numer, denom, whole = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if denom == 0:
            return None
        if whole % denom == 0:
            ans = (whole // denom) * numer
            ans_display = str(ans)
        else:
            ans_float = (whole / denom) * numer
            ans_display = f"{ans_float:.2f}".rstrip("0").rstrip(".")
        return {
            "topic": "fractions",
            "answer": ans_display,
            "steps": [
                {"title": "Understand the fraction", "text": f"{numer}/{denom} means {numer} out of {denom} equal parts."},
                {"title": "Divide into equal parts", "text": f"Divide {whole} into {denom} equal parts. Each part = {whole}/{denom}."},
                {"title": "Take the parts", "text": f"Take {numer} part(s). {numer} × {whole // denom if whole % denom == 0 else whole / denom:.1f} = {ans_display}."},
            ],
            "smaller_example": f"Smaller example: 1/2 of 10 = 5",
        }

    # Same-denominator add/sub
    m2 = FRACTION_ADD_SUB_RE.search(q)
    if m2:
        n1, d1, op, n2, d2 = int(m2.group(1)), int(m2.group(2)), m2.group(3), int(m2.group(4)), int(m2.group(5))
        if d1 == d2 and d1 != 0:
            result_n = n1 + n2 if op == "+" else n1 - n2
            s_n, s_d = _simplify(result_n, d1)
            if s_d == 1:
                ans_str = str(s_n)
            else:
                ans_str = f"{s_n}/{s_d}"
            verb = "add" if op == "+" else "subtract"
            return {
                "topic": "fractions",
                "answer": ans_str,
                "steps": [
                    {"title": "Same denominator", "text": f"Both fractions have denominator {d1}, so we {verb} just the top numbers."},
                    {"title": f"{verb.capitalize()} numerators", "text": f"{n1} {op} {n2} = {result_n}."},
                    {"title": "Result", "text": f"Answer: {ans_str}. Each part is 1/{d1} of the whole."},
                ],
                "smaller_example": "Smaller example: 1/4 + 2/4 = 3/4",
            }

    # Compare two fractions — must run before comparison.py intercepts
    # "compare 3/4 and 1/2" / "which is bigger: 2/3 or 1/3?"
    fracs = re.findall(r"(\d+)\s*/\s*(\d+)", q)
    if len(fracs) >= 2 and re.search(r"\b(compare|bigger|smaller|greater|less|which|vs)\b", q, re.IGNORECASE):
        n1, d1 = int(fracs[0][0]), int(fracs[0][1])
        n2, d2 = int(fracs[1][0]), int(fracs[1][1])
        if d1 > 0 and d2 > 0:
            v1, v2 = n1 / d1, n2 / d2
            if v1 > v2:
                desc = f"{n1}/{d1} is greater than {n2}/{d2}."
            elif v2 > v1:
                desc = f"{n2}/{d2} is greater than {n1}/{d1}."
            else:
                desc = f"{n1}/{d1} and {n2}/{d2} are equal."
            return {
                "topic": "fractions",
                "answer": desc,
                "steps": [
                    {"title": "Convert to decimals", "text": f"{n1}/{d1} = {v1:.3f},  {n2}/{d2} = {v2:.3f}."},
                    {"title": "Compare", "text": f"{v1:.3f} {'>' if v1 > v2 else ('<' if v1 < v2 else '=')} {v2:.3f}."},
                    {"title": "Answer", "text": desc},
                ],
                "smaller_example": "Smaller example: 3/4 > 1/2 because 0.75 > 0.5",
            }

    return None



def build_steps(data: dict) -> list:
    return data.get("steps", [])
