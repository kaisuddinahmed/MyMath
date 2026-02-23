"""
backend/math_engine/word_problem_parser.py
Lightweight sentence-level parser for word problems.
Extracts: numbers, operation type, and a direct expression where possible.
"""
import re
from typing import Optional

# Operation keyword groups
# NOTE: order matters — checked top to bottom, first match wins.
# 'total' / 'bought' / 'received' removed: all appear in multiplication questions too
# and must not be treated as guaranteed addition signals.
ADD_WORDS = ["more", "together", "sum", "combined", "plus", "added", "add", "increased by"]
SUB_WORDS = ["less", "fewer", "left", "remain", "difference", "minus", "subtract", "took", "gave away", "spent", "lost", "removed", "decreased by", "how many more"]

# Division phrases that contain 'each' must be checked BEFORE bare 'each' in MUL_WORDS.
# Check the whole phrase first so 'how many in each team' resolves as division.
DIV_WORDS = [
    "divided", "shared equally", "share equally", "equally among", "equally between",
    "split equally", "split into", "distribute", "how many in each", "how many does each",
    "how many per", "per person", "per team", "per group", "per student",
    "in each team", "in each group", "in each row", "in each box",
    "each team gets", "each group gets", "each person gets", "each student gets",
    "into equal", "into groups of", "make equal groups", "teams of equal",
    "makes.*teams", "makes.*groups",   # handled below via regex
    "how many each", "each get", "each share",
]
MUL_WORDS = [
    "times", "groups of", "multiplied", "product", "double", "triple",
    "rows of", "arrays of",
    # 'each' included here as LAST resort — division compound phrases take priority above.
    "each",
]

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

    # Detect operation.
    # Priority: addition → subtraction → division (compound phrases) → multiplication
    # 'each' is inherently ambiguous:
    #   - "how many in each team"  → DIVISION  (asking rate)
    #   - "each packet has 12"     → MULTIPLICATION (given rate)
    # We resolve it via pattern matching before falling back to bare keyword.
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

    # Division compound phrases — specific enough to win over bare keywords
    if not op:
        for w in DIV_WORDS:
            if ".*" in w:
                if re.search(w, q):
                    op = "÷"
                    break
            elif w in q:
                op = "÷"
                break

    # Context-aware 'each' resolution (only when not yet decided)
    if not op and "each" in q:
        # Division signals: question is ASKING for a per-group quantity
        # e.g. "how many students are there in each team?"
        if re.search(r"(how many|how much).{0,30}(in each|per|each\s+\w+\?)", q):
            op = "÷"
        # Multiplication signals: 'each' is GIVING a per-group quantity as a fact
        # e.g. "each packet has 12", "each bag contains 5"
        elif re.search(r"each\s+\w+\s+(has|have|had|contains|holds|cost|costs|hold)", q):
            op = "×"

    if not op:
        for w in MUL_WORDS:
            if w in q:
                op = "×"
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
