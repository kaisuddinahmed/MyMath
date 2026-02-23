"""
backend/math_engine/topics/comparison.py
Deterministic solver for comparison questions.
Handles: >, <, =, ordering numbers, between.
"""
import re
from typing import Optional

# Comparison keyword (can appear anywhere in question)
COMPARE_KEYWORD_RE = re.compile(
    r"\b(?:bigger|smaller|greater|less|compare|which is larger|which is more|largest|smallest)\b",
    re.IGNORECASE,
)
COMPARE_OP_RE = re.compile(r"(\d+)\s*([><]=?|==?)\s*(\d+)", re.IGNORECASE)
COMPARE_TWO_RE = re.compile(r"(\d+)\s*(?:vs\.?)\s*(\d+)", re.IGNORECASE)
ORDER_RE = re.compile(r"order.*?([\d ,]+)", re.IGNORECASE)
BETWEEN_RE = re.compile(r"between\s+(\d+)\s+and\s+(\d+)", re.IGNORECASE)


def solve_comparison(question: str) -> Optional[dict]:
    q = question.strip()

    # Explicit operator (>, <, =)
    m = COMPARE_OP_RE.search(q)
    if m:
        a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        if op in [">", "<", ">="]:
            word = "greater" if op == ">" else ("less" if op == "<" else "greater or equal")
            result = (a > b if op == ">" else (a < b if op == "<" else a >= b))
            ans = f"{a} {op} {b} is {'True' if result else 'False'}. {a} is {'' if result else 'not '}{word} than {b}."
        else:
            ans = f"{a} {'equals' if a == b else 'does not equal'} {b}."
        return {
            "topic": "comparison",
            "answer": ans,
            "steps": [
                {"title": "Look at the numbers", "text": f"We are comparing {a} and {b}."},
                {"title": "Which is bigger?", "text": f"{max(a,b)} is bigger than {min(a,b)}."},
                {"title": "Answer", "text": ans},
            ],
            "smaller_example": "Smaller example: 7 > 4 means 7 is greater than 4.",
        }

    # Explicit comparison keyword anywhere in question
    if COMPARE_KEYWORD_RE.search(q):
        nums = re.findall(r"\d+", q)
        if len(nums) >= 2:
            a, b = int(nums[0]), int(nums[1])
            if a > b:
                desc = f"{a} is greater than {b}."
            elif b > a:
                desc = f"{b} is greater than {a}."
            else:
                desc = f"{a} and {b} are equal."
            return {
                "topic": "comparison",
                "answer": desc,
                "steps": [
                    {"title": "Compare the numbers", "text": f"We look at {a} and {b}."},
                    {"title": "Find the bigger one", "text": f"Count up: {min(a,b)} comes before {max(a,b)} on the number line."},
                    {"title": "Answer", "text": desc},
                ],
                "smaller_example": "Smaller example: 9 is greater than 6.",
            }

    # X vs Y
    m2 = COMPARE_TWO_RE.search(q)
    if m2:
        a, b = int(m2.group(1)), int(m2.group(2))
        desc = (f"{a} is greater than {b}." if a > b else
                f"{b} is greater than {a}." if b > a else
                f"{a} and {b} are equal.")
        return {
            "topic": "comparison",
            "answer": desc,
            "steps": [{"title": "Compare", "text": desc}],
            "smaller_example": "Smaller example: 9 is greater than 6.",
        }

    # Between
    m3 = BETWEEN_RE.search(q)
    if m3:
        a, b = int(m3.group(1)), int(m3.group(2))
        between = list(range(min(a, b) + 1, max(a, b)))
        ans = ", ".join(str(x) for x in between) if between else "no whole numbers"
        return {
            "topic": "comparison",
            "answer": ans,
            "steps": [
                {"title": "Find the range", "text": f"We want whole numbers between {a} and {b} (not including them)."},
                {"title": "Count up", "text": f"Start at {min(a,b)+1}, stop before {max(a,b)}."},
                {"title": "Answer", "text": f"Numbers between {a} and {b}: {ans}."},
            ],
            "smaller_example": "Smaller example: numbers between 3 and 7 are 4, 5, 6.",
        }

    return None
