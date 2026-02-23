"""
backend/math_engine/topics/ratio.py
Deterministic solver for ratio and simple proportion.
"""
import re
from math import gcd
from typing import Optional

# "ratio of 4 to 6" / "4:6"
RATIO_RE = re.compile(r"ratio\s+(?:of\s+)?(\d+)\s+(?:to\s+|:)(\d+)|(\d+)\s*:\s*(\d+)", re.IGNORECASE)
# "divide 20 in ratio 2:3"
DIVIDE_RATIO_RE = re.compile(r"divide\s+(\d+)\s+(?:in|into)\s+(?:ratio\s+)?(\d+)\s*:\s*(\d+)", re.IGNORECASE)
# "if 3 costs 12, what does 7 cost?" — unitary method
UNITARY_RE = re.compile(r"if\s+(\d+)\s+\S+\s+(?:cost|weigh|measure|is|are)\s+(\d+(?:\.\d+)?),?\s+(?:what|how much)\s+(?:does?\s+)?(\d+)", re.IGNORECASE)


def _simplify(a: int, b: int):
    g = gcd(a, b)
    return a // g, b // g


def solve_ratio(question: str) -> Optional[dict]:
    q = question.strip()

    # Divide in ratio
    m = DIVIDE_RATIO_RE.search(q)
    if m:
        total = int(m.group(1))
        r1, r2 = int(m.group(2)), int(m.group(3))
        parts = r1 + r2
        share1 = (r1 / parts) * total
        share2 = (r2 / parts) * total
        s1 = str(int(share1)) if share1 == int(share1) else f"{share1:.2f}"
        s2 = str(int(share2)) if share2 == int(share2) else f"{share2:.2f}"
        return {
            "topic": "ratio",
            "answer": f"{s1} and {s2}",
            "steps": [
                {"title": "Total parts", "text": f"Ratio {r1}:{r2} means {parts} equal parts in total."},
                {"title": "Value of each part", "text": f"{total} ÷ {parts} = {total/parts:.2f} per part."},
                {"title": "Share out", "text": f"First share: {r1} × {total//parts if total%parts==0 else total/parts:.2f} = {s1}. Second share: {s2}."},
            ],
            "smaller_example": "Smaller example: divide 10 in ratio 2:3 → 4 and 6",
        }

    # Simple ratio / simplify
    m = RATIO_RE.search(q)
    if m:
        a = int(m.group(1) or m.group(3))
        b = int(m.group(2) or m.group(4))
        sa, sb = _simplify(a, b)
        return {
            "topic": "ratio",
            "answer": f"{sa}:{sb}",
            "steps": [
                {"title": "Write the ratio", "text": f"The ratio is {a}:{b}."},
                {"title": "Simplify", "text": f"Find GCD of {a} and {b}: GCD = {gcd(a,b)}."},
                {"title": "Simplest form", "text": f"{a}÷{gcd(a,b)} : {b}÷{gcd(a,b)} = {sa}:{sb}."},
            ],
            "smaller_example": "Smaller example: 4:6 = 2:3",
        }

    # Unitary method
    m = UNITARY_RE.search(q)
    if m:
        qty1 = int(m.group(1))
        cost1 = float(m.group(2))
        qty2 = int(m.group(3))
        unit_cost = cost1 / qty1
        total_cost = unit_cost * qty2
        tc_str = str(int(total_cost)) if total_cost == int(total_cost) else f"{total_cost:.2f}"
        return {
            "topic": "ratio",
            "answer": tc_str,
            "steps": [
                {"title": "Find unit cost", "text": f"If {qty1} items cost {cost1}, then 1 item costs {cost1} ÷ {qty1} = {unit_cost}."},
                {"title": "Scale up", "text": f"{qty2} items cost {qty2} × {unit_cost} = {tc_str}."},
                {"title": "Answer", "text": f"Cost for {qty2}: {tc_str}."},
            ],
            "smaller_example": "Smaller example: 3 pens cost 12, so 1 pen costs 4, and 5 pens cost 20.",
        }

    return None
