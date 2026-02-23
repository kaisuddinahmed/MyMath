"""
backend/math_engine/topics/percentages.py
Deterministic solver for percentages.
"""
import re
from typing import Optional

# "what is 25% of 80"
PERCENT_OF_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%\s+of\s+(\d+(?:\.\d+)?)", re.IGNORECASE)
# "25 percent of 80"
PERCENT_WORD_RE = re.compile(r"(\d+(?:\.\d+)?)\s+percent\s+of\s+(\d+(?:\.\d+)?)", re.IGNORECASE)
# "what percent is 20 of 80?" or "20 is what % of 80"
WHAT_PERCENT_RE = re.compile(r"(\d+(?:\.\d+)?)\s+is\s+what\s+(?:percent|%)\s+of\s+(\d+(?:\.\d+)?)", re.IGNORECASE)
# "80 increased by 25%" / "discount: 20% off 80"
PERCENT_CHANGE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:taka|£|\$|₹|€)?\s+(?:increased?|decreased?|discount|off)\s+by\s+(\d+(?:\.\d+)?)\s*%", re.IGNORECASE)


def _fmt(n: float) -> str:
    return str(int(n)) if n == int(n) else f"{n:.2f}".rstrip("0").rstrip(".")


def solve_percentages(question: str) -> Optional[dict]:
    q = question.strip()

    # "X% of Y"
    m = PERCENT_OF_RE.search(q) or PERCENT_WORD_RE.search(q)
    if m:
        pct = float(m.group(1))
        whole = float(m.group(2))
        ans = (pct / 100) * whole
        return {
            "topic": "percentages",
            "answer": _fmt(ans),
            "steps": [
                {"title": "Percent means per hundred", "text": f"{pct}% means {pct} out of 100."},
                {"title": "Set up the calculation", "text": f"{pct}% of {_fmt(whole)} = ({pct} ÷ 100) × {_fmt(whole)}."},
                {"title": "Calculate", "text": f"{pct/100} × {_fmt(whole)} = {_fmt(ans)}."},
            ],
            "smaller_example": "Smaller example: 10% of 50 = 5",
        }

    # "X is what % of Y"
    m2 = WHAT_PERCENT_RE.search(q)
    if m2:
        part = float(m2.group(1))
        whole = float(m2.group(2))
        if whole == 0:
            return None
        pct = (part / whole) * 100
        return {
            "topic": "percentages",
            "answer": f"{_fmt(pct)}%",
            "steps": [
                {"title": "Fraction first", "text": f"{_fmt(part)} out of {_fmt(whole)} = {_fmt(part)}/{_fmt(whole)}."},
                {"title": "Convert to percent", "text": f"({_fmt(part)} ÷ {_fmt(whole)}) × 100 = {_fmt(pct)}%."},
                {"title": "Answer", "text": f"{_fmt(part)} is {_fmt(pct)}% of {_fmt(whole)}."},
            ],
            "smaller_example": "Smaller example: 25 is what % of 100 → 25%",
        }

    # Percent change / discount
    m3 = PERCENT_CHANGE_RE.search(q)
    if m3:
        amount = float(m3.group(1))
        pct = float(m3.group(2))
        change = (pct / 100) * amount
        ql = q.lower()
        if "increas" in ql:
            result = amount + change
            verb = "increased"
        else:
            result = amount - change
            verb = "discounted / decreased"
        return {
            "topic": "percentages",
            "answer": _fmt(result),
            "steps": [
                {"title": "Find the change amount", "text": f"{pct}% of {_fmt(amount)} = {_fmt(change)}."},
                {"title": f"Apply the {verb} change", "text": f"{_fmt(amount)} {'+ ' if 'increas' in ql else '- '}{_fmt(change)} = {_fmt(result)}."},
                {"title": "Answer", "text": f"Result: {_fmt(result)}."},
            ],
            "smaller_example": "Smaller example: 20% off 100 taka → save 20, pay 80 taka",
        }

    return None
