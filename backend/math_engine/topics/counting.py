"""
backend/math_engine/topics/counting.py
Deterministic solver for counting and skip-counting.
"""
import re
from typing import Optional

# "count by 2s from 0 to 20", "skip count by 5 starting at 0"
SKIP_COUNT_RE = re.compile(r"(?:skip.?count|count by)\s+(\d+)(?:s)?(?:\s+from\s+(\d+))?(?:\s+to\s+(\d+))?", re.IGNORECASE)
# "what is the 4th ordinal" / "3rd, 4th..."
ORDINAL_RE = re.compile(r"(\d+)(st|nd|rd|th)(?:\s+(?:number|item|place|object|position))?", re.IGNORECASE)
ORDINAL_WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
ORDINAL_SUFFIX = {1: "st", 2: "nd", 3: "rd"}


def _ordinal_suffix(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    return f"{n}{ORDINAL_SUFFIX.get(n % 10, 'th')}"


def solve_counting(question: str) -> Optional[dict]:
    q = question.strip()
    ql = q.lower()

    # Skip counting
    m = SKIP_COUNT_RE.search(q)
    if m:
        step = int(m.group(1))
        start = int(m.group(2)) if m.group(2) else 0
        end = int(m.group(3)) if m.group(3) else start + step * 9
        if step == 0 or (end - start) / step > 50:
            return None
        sequence = list(range(start, end + 1, step))
        seq_str = ", ".join(str(x) for x in sequence)
        return {
            "topic": "counting",
            "answer": seq_str,
            "steps": [
                {"title": "Skip counting by " + str(step), "text": f"Start at {start}. Jump forward by {step} each time."},
                {"title": "List the numbers", "text": f"The sequence is: {seq_str}."},
                {"title": "Pattern", "text": f"Each number is {step} more than the one before."},
            ],
            "smaller_example": f"Smaller example: count by {step}s from 0: 0, {step}, {step*2}, {step*3}...",
        }

    # Ordinal words — only fire if not followed by another noun (e.g., "first 5 multiples")
    SKIP_CONTEXTS = ["multiples", "factors", "prime", "number", "question", "step", "chapter"]
    for word in ORDINAL_WORDS:
        if word in ql:
            # Find position and check what follows
            idx = ql.index(word)
            after = ql[idx + len(word):idx + len(word) + 40]
            # Skip if this ordinal is a quantifier before another noun (e.g. "first 5 multiples")
            if any(ctx in after for ctx in SKIP_CONTEXTS):
                continue
            n = ORDINAL_WORDS.index(word) + 1
            return {
                "topic": "counting",
                "answer": _ordinal_suffix(n),
                "steps": [
                    {"title": "Ordinal numbers", "text": "Ordinal numbers tell position: 1st, 2nd, 3rd, 4th..."},
                    {"title": f"What is {word}?", "text": f"{word.capitalize()} means position number {n}."},
                    {"title": "Answer", "text": f"The {word} position is {_ordinal_suffix(n)}."},
                ],
                "smaller_example": "Smaller example: 1st = first, 2nd = second, 3rd = third.",
            }

    m2 = ORDINAL_RE.search(q)
    if m2:
        n = int(m2.group(1))
        if 1 <= n <= 100:
            return {
                "topic": "counting",
                "answer": _ordinal_suffix(n),
                "steps": [
                    {"title": "Ordinal numbers", "text": "Ordinal numbers show position in a line or sequence."},
                    {"title": f"What is ordinal {n}?", "text": f"We write position {n} as {_ordinal_suffix(n)}."},
                    {"title": "Answer", "text": f"{_ordinal_suffix(n)} is the ordinal for number {n}."},
                ],
                "smaller_example": "Smaller example: 4 → 4th",
            }

    return None

