"""
backend/math_engine/topics/patterns.py
Deterministic solver for number patterns and sequences.
"""
import re
from typing import Optional, List

# Standard arithmetic/geometric sequences
SEQ_RE = re.compile(r"([\d,\s]+)[,_?]*\s*[\?_]+", re.IGNORECASE)
SEQ_CLEAN = re.compile(r"\d+")

# NCTB Class 1 Chapter 3: Sequences (Next/Previous/Between)
NEXT_RE = re.compile(r"next\s+number.*?([\d]+)", re.IGNORECASE)
PREV_RE = re.compile(r"(?:previous|number before).*?([\d]+)", re.IGNORECASE)
BETWEEN_NUM_RE = re.compile(r"between\s+(\d+)\s+and\s+(\d+)", re.IGNORECASE)

# Sequences with blanks (e.g. "_, 2", "1, _, 3", "3, _")
BLANK_BEFORE = re.compile(r"^[_\?][,\s]+(\d+)")
BLANK_AFTER = re.compile(r"(\d+)[,\s]+[_\?]$")
BLANK_BETWEEN = re.compile(r"(\d+)[,\s]+[_\?][,\s]+(\d+)")


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


def _solve_simple_sequence(q: str) -> Optional[dict]:
    """Solve Class 1 Chapter 3 sequence problems."""
    # Previous number
    m = PREV_RE.search(q) or BLANK_BEFORE.search(q.replace('?', '_'))
    if m:
        num = int(m.group(1))
        ans = num - 1
        return {
            "topic": "patterns",
            "sub_concept": "previous_number",
            "answer": str(ans),
            "steps": [
                {"title": "Look at the number", "text": f"The number is {num}."},
                {"title": "Count backward", "text": f"The number that comes just before {num} is {ans}."},
                {"title": "Answer", "text": f"The previous number is {ans}."},
            ],
            "smaller_example": "Smaller example: Before 5 comes 4.",
        }

    # Number in between
    m = BETWEEN_NUM_RE.search(q) or BLANK_BETWEEN.search(q.replace('?', '_'))
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        a, b = min(a, b), max(a, b)
        if b - a == 2:
            ans = a + 1
            return {
                "topic": "patterns",
                "sub_concept": "number_between",
                "answer": str(ans),
                "steps": [
                    {"title": "Look at the numbers", "text": f"The numbers are {a} and {b}."},
                    {"title": "Count forward", "text": f"After {a} comes {ans}, and then comes {b}."},
                    {"title": "Answer", "text": f"The number between {a} and {b} is {ans}."},
                ],
                "smaller_example": "Smaller example: Between 2 and 4 is 3.",
            }

    # Next number
    m = NEXT_RE.search(q) or BLANK_AFTER.search(q.replace('?', '_'))
    if m:
        num = int(m.group(1))
        ans = num + 1
        return {
            "topic": "patterns",
            "sub_concept": "next_number",
            "answer": str(ans),
            "steps": [
                {"title": "Look at the number", "text": f"The number is {num}."},
                {"title": "Count forward", "text": f"The number that comes just after {num} is {ans}."},
                {"title": "Answer", "text": f"The next number is {ans}."},
            ],
            "smaller_example": "Smaller example: After 5 comes 6.",
        }

    return None


def solve_patterns(question: str) -> Optional[dict]:
    q = question.strip()

    # 1. Try Class 1 sequence gaps first
    simple_seq = _solve_simple_sequence(q)
    if simple_seq:
        return simple_seq

    # 2. Extract standard pattern sequences
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

