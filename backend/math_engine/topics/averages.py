"""
backend/math_engine/topics/averages.py
Deterministic solver for mean/average.
"""
import re
from typing import Optional

# "find the average of 10, 20, 30"
AVG_RE = re.compile(r"(?:average|mean)\s+of\s+([\d,\s]+)", re.IGNORECASE)
NUMBERS_RE = re.compile(r"\d+")


def solve_averages(question: str) -> Optional[dict]:
    q = question.strip()
    m = AVG_RE.search(q)

    if not m:
        return None  # require explicit "average of" / "mean of" keyword

    nums = [int(x) for x in NUMBERS_RE.findall(m.group(1))]
    if len(nums) < 2:
        return None

    total = sum(nums)
    count = len(nums)
    avg = total / count
    avg_str = str(int(avg)) if avg == int(avg) else f"{avg:.2f}"

    return {
        "topic": "averages",
        "answer": avg_str,
        "steps": [
            {"title": "Add all numbers", "text": f"Add: {' + '.join(str(n) for n in nums)} = {total}."},
            {"title": "Count the numbers", "text": f"There are {count} numbers."},
            {"title": "Divide", "text": f"Average = {total} ÷ {count} = {avg_str}."},
        ],
        "smaller_example": "Smaller example: average of 4, 6, 8 → (4+6+8)÷3 = 6",
    }

