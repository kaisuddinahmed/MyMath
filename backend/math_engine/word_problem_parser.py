"""
backend/math_engine/word_problem_parser.py
Lightweight sentence-level parser for word problems.
Extracts: numbers, operation type, and a direct expression where possible.
"""
import re
from typing import Optional

# Operation keyword groups
ADD_WORDS = ["more", "total", "together", "sum", "combined", "plus", "added", "add", "increased by", "bought", "received"]
SUB_WORDS = ["less", "fewer", "left", "remain", "difference", "minus", "subtract", "took", "gave away", "spent", "lost", "removed", "decreased by", "how many more"]
MUL_WORDS = ["times", "each", "every", "groups of", "multiplied", "product", "double", "triple"]
DIV_WORDS = ["divided", "shared", "equally", "per", "each get", "split", "distribute", "how many in each"]

NUMBERS_RE = re.compile(r"\b(\d+(?:\.\d+)?)\b")


def parse_word_problem(question: str) -> Optional[dict]:
    """
    Returns {numbers, operation, expression, confidence} or None.
    `expression` is a best-effort simplified math expression string.
    """
    q = question.lower().strip()
    nums_raw = NUMBERS_RE.findall(q)
    if len(nums_raw) < 2:
        return None

    nums = [float(n) for n in nums_raw]

    def _ints(lst):
        return [int(x) if x == int(x) else x for x in lst]

    nums_int = _ints(nums)

    # Detect operation by keyword priority
    op = None
    for w in ADD_WORDS:
        if w in q:
            op = "+"
            break
    if not op:
        for w in SUB_WORDS:
            if w in q:
                op = "-"
                break
    if not op:
        for w in MUL_WORDS:
            if w in q:
                op = "×"
                break
    if not op:
        for w in DIV_WORDS:
            if w in q:
                op = "÷"
                break

    if not op:
        return None

    # Build best-effort expression from first two numbers
    a, b = nums_int[0], nums_int[1]
    if op == "+":
        expr = f"{a} + {b}"
        ans = float(nums[0]) + float(nums[1])
    elif op == "-":
        large, small = (a, b) if nums[0] >= nums[1] else (b, a)
        expr = f"{large} - {small}"
        ans = float(large) - float(small)
    elif op == "×":
        expr = f"{a} × {b}"
        ans = float(nums[0]) * float(nums[1])
    elif op == "÷":
        if nums[1] == 0:
            return None
        expr = f"{a} ÷ {b}"
        ans = float(nums[0]) / float(nums[1])
    else:
        return None

    ans_str = str(int(ans)) if ans == int(ans) else f"{ans:.4f}".rstrip("0").rstrip(".")

    return {
        "numbers": nums_int,
        "operation": op,
        "expression": expr,
        "answer": ans_str,
        "confidence": "high" if len(nums_raw) == 2 else "medium",
    }
