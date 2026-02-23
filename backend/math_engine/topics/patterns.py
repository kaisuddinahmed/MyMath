"""
backend/math_engine/topics/patterns.py
Deterministic solver for number patterns and sequences.
"""
import re
from typing import Optional, List

# "2, 4, 6, 8, ___" or "what comes next: 3, 6, 9, 12"
SEQ_RE = re.compile(r"([\d,\s]+)[,_?]*\s*[\?_]+", re.IGNORECASE)
SEQ_CLEAN = re.compile(r"\d+")


def _find_pattern(nums: List[int]):
    """Returns (type, common_diff_or_ratio) or None."""
    if len(nums) < 2:
        return None
    diffs = [nums[i+1] - nums[i] for i in range(len(nums)-1)]
    if len(set(diffs)) == 1:
        return "arithmetic", diffs[0]
    if all(nums[i] != 0 for i in range(len(nums)-1)):
        ratios = [nums[i+1] / nums[i] for i in range(len(nums)-1)]
        rounded = [round(r, 4) for r in ratios]
        if len(set(rounded)) == 1:
            return "geometric", rounded[0]
    return None


def solve_patterns(question: str) -> Optional[dict]:
    q = question.strip()

    # Extract all numbers from the question
    numbers = SEQ_CLEAN.findall(q)
    if len(numbers) < 3:
        return None

    nums = [int(n) for n in numbers]
    result = _find_pattern(nums)
    if not result:
        return None

    ptype, value = result

    if ptype == "arithmetic":
        next_val = nums[-1] + int(value)
        direction = "increase" if value > 0 else "decrease"
        return {
            "topic": "patterns",
            "answer": str(next_val),
            "steps": [
                {"title": "Look at the pattern", "text": f"The numbers are: {', '.join(str(n) for n in nums)}."},
                {"title": "Find the rule", "text": f"Each number {'increases' if value > 0 else 'decreases'} by {abs(int(value))}."},
                {"title": "Apply the rule", "text": f"After {nums[-1]}, we {direction} by {abs(int(value))}: {nums[-1]} {'+' if value > 0 else '-'} {abs(int(value))} = {next_val}."},
            ],
            "smaller_example": "Smaller example: 2, 4, 6, 8, ___ → 10 (add 2 each time)",
        }

    if ptype == "geometric":
        ratio = int(value) if value == int(value) else value
        next_val = int(nums[-1] * ratio)
        return {
            "topic": "patterns",
            "answer": str(next_val),
            "steps": [
                {"title": "Look at the pattern", "text": f"The numbers are: {', '.join(str(n) for n in nums)}."},
                {"title": "Find the rule", "text": f"Each number is multiplied by {ratio}."},
                {"title": "Apply the rule", "text": f"{nums[-1]} × {ratio} = {next_val}."},
            ],
            "smaller_example": "Smaller example: 2, 4, 8, 16, ___ → 32 (multiply by 2 each time)",
        }

    return None
