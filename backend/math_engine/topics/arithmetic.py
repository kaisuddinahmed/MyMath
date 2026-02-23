"""
backend/math_engine/topics/arithmetic.py
Deterministic solver for: addition, subtraction, multiplication, division.
"""
import re
from typing import Optional, Tuple

# Supports both bare "34 + 27" and wrapped "What is 34 + 27?", "Calculate 90 - 45", etc.
ADD_SUB_RE = re.compile(r"(?:^|\b)(\d{1,6})\s*([+\-])\s*(\d{1,6})(?:\s*=\s*[?_]*)?\s*$", re.IGNORECASE)
MUL_DIV_RE = re.compile(r"(?:^|\b)(\d{1,6})\s*([xX*÷/])\s*(\d{1,6})(?:\s*=\s*[?_]*)?\s*$", re.IGNORECASE)
# Wrapper-aware versions: extract bare expression from question sentences
WRAPPER_ADD_SUB_RE = re.compile(r"\b(\d{1,6})\s*([+\-])\s*(\d{1,6})\b", re.IGNORECASE)
WRAPPER_MUL_DIV_RE = re.compile(r"\b(\d{1,6})\s*([xX*÷/])\s*(\d{1,6})\b", re.IGNORECASE)


def solve_add_sub(question: str) -> Optional[Tuple]:
    # Skip if this is a fraction or decimal context
    if re.search(r"\b(fraction|half|quarter|third|of the|\d+/\d+)\b", question, re.IGNORECASE):
        return None
    # Skip if question contains decimal numbers — let decimals solver handle
    if re.search(r"\b\d+\.\d+\b", question):
        return None
    # Try bare expression first
    m = ADD_SUB_RE.search(question)
    if not m:
        # Try extracting from sentence wrapper
        m = WRAPPER_ADD_SUB_RE.search(question)
    if not m:
        return None
    # If question also has multiplication/division, skip
    if re.search(r"\b\d+\s*[xX*\u00f7/]\s*\d+", question):
        return None
    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
    ans = a + b if op == "+" else a - b
    return a, op, b, ans


def solve_mul_div(question: str) -> Optional[Tuple]:
    # Skip fraction context: '1/2 of', 'compare 3/4 and 1/2', etc.
    if re.search(r"\b(fraction|half|quarter|third|of the)\b", question, re.IGNORECASE):
        return None
    frac_like = re.search(r"\b(\d)\s*/\s*(\d)\b", question)
    if frac_like and re.search(r"\b(of|fraction|compare|bigger|smaller|add)\b", question, re.IGNORECASE):
        return None

    m = MUL_DIV_RE.search(question)
    if not m:
        m = WRAPPER_MUL_DIV_RE.search(question)
    if not m:
        return None
    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
    if op in ["x", "X", "*"]:
        return a, op, b, a * b
    # Division
    if b == 0:
        return a, op, b, None
    quotient = a // b
    remainder = a % b
    return a, op, b, (quotient, remainder)

def build_steps(grade: int, a: int, op: str, b: int, ans) -> list:
    """Returns list of {title, text} dicts."""
    from backend.math_engine.topics.arithmetic import _steps_for_op
    return _steps_for_op(grade, a, op, b, ans)


def _steps_for_op(grade: int, a: int, op: str, b: int, ans) -> list:
    if op == "+":
        return [
            {"title": "What we need to do", "text": f"We add {a} and {b}."},
            {"title": "Count on", "text": f"Start at {a}. Count up {b} times."},
            {"title": "Result", "text": f"After counting up {b} times, we get {ans}."},
        ]
    if op == "-":
        return [
            {"title": "What we need to do", "text": f"We subtract {b} from {a}."},
            {"title": "Count back", "text": f"Start at {a}. Count back {b} times."},
            {"title": "Result", "text": f"After counting back {b} times, we get {ans}."},
        ]
    if op in ["x", "X", "*"]:
        return [
            {"title": "What it means", "text": f"{a} × {b} means {a} groups of {b}."},
            {"title": "Make groups", "text": f"Make {a} groups. Put {b} counters in each group."},
            {"title": "Count all", "text": f"Count all counters. Total is {ans}."},
        ]
    if op in ["÷", "/"]:
        if isinstance(ans, tuple):
            q, r = ans
            if r == 0:
                return [
                    {"title": "What it means", "text": f"{a} ÷ {b} means sharing {a} equally into {b} groups."},
                    {"title": "Share equally", "text": f"Put the {a} items into {b} groups."},
                    {"title": "Result", "text": f"Each group gets {q}."},
                ]
            else:
                return [
                    {"title": "What it means", "text": f"{a} ÷ {b} means sharing {a} into groups of {b}."},
                    {"title": "Share equally", "text": f"Each group gets {q}, with {r} left over."},
                    {"title": "Result", "text": f"Quotient: {q}, Remainder: {r}."},
                ]
        return [
            {"title": "What it means", "text": f"{a} ÷ {b} means sharing {a} equally into {b} groups."},
            {"title": "Share equally", "text": f"Put the {a} items into {b} groups."},
            {"title": "Result", "text": f"Each group gets {ans}."},
        ]
    return [{"title": "Not supported", "text": "Try: 12 + 5, 4 x 3, or 12 ÷ 3"}]


def build_smaller_example(op: str) -> str:
    examples = {
        "+": "Smaller example: 5 + 2 = 7",
        "-": "Smaller example: 7 - 2 = 5",
        "x": "Smaller example: 3 x 2 = 6",
        "X": "Smaller example: 3 x 2 = 6",
        "*": "Smaller example: 3 x 2 = 6",
        "÷": "Smaller example: 8 ÷ 2 = 4",
        "/": "Smaller example: 8 ÷ 2 = 4",
    }
    return examples.get(op, "Smaller example: 5 + 2 = 7")
