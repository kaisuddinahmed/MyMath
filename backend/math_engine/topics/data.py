"""
backend/math_engine/topics/data.py
Deterministic solver for data handling: tally, mode, range, reading lists.
"""
import re
from typing import Optional
from collections import Counter

# "mode of 2, 4, 4, 6, 4, 8"
MODE_RE = re.compile(r"mode\s+of\s+([\d,\s]+)", re.IGNORECASE)
# "range of 3, 7, 2, 9, 5"
RANGE_RE = re.compile(r"range\s+of\s+([\d,\s]+)", re.IGNORECASE)
NUMBERS_RE = re.compile(r"\d+")


def solve_data(question: str) -> Optional[dict]:
    q = question.strip()

    # Mode
    m = MODE_RE.search(q)
    if m:
        nums = [int(x) for x in NUMBERS_RE.findall(m.group(1))]
        if len(nums) < 2:
            return None
        counts = Counter(nums)
        max_count = max(counts.values())
        modes = sorted(k for k, v in counts.items() if v == max_count)
        modes_str = ", ".join(str(x) for x in modes)
        return {
            "topic": "data",
            "answer": modes_str,
            "steps": [
                {"title": "What is the mode?", "text": "The mode is the number that appears most often."},
                {"title": "Count each number", "text": f"Numbers: {', '.join(str(n) for n in nums)}. Count how many times each appears."},
                {"title": "Answer", "text": f"The mode is {modes_str} (appears {max_count} times)."},
            ],
            "smaller_example": "Smaller example: mode of 2, 4, 4, 6 → 4 (appears most)",
        }

    # Range
    m = RANGE_RE.search(q)
    if m:
        nums = [int(x) for x in NUMBERS_RE.findall(m.group(1))]
        if len(nums) < 2:
            return None
        r = max(nums) - min(nums)
        return {
            "topic": "data",
            "answer": str(r),
            "steps": [
                {"title": "What is the range?", "text": "Range = highest number − lowest number."},
                {"title": "Find highest and lowest", "text": f"Highest: {max(nums)}. Lowest: {min(nums)}."},
                {"title": "Subtract", "text": f"{max(nums)} − {min(nums)} = {r}."},
            ],
            "smaller_example": "Smaller example: range of 3, 7, 2, 9 → 9 − 2 = 7",
        }

    return None
