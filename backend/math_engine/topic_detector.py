"""
backend/math_engine/topic_detector.py
Scored topic classifier: regex → pattern → keyword → unknown.
"""
import re
from backend.core.config import TOPIC_KEYWORDS

ADD_SUB_RE = re.compile(r"^\s*(\d{1,5})\s*([+\-])\s*(\d{1,5})\s*$")
MUL_DIV_RE = re.compile(r"^\s*(\d{1,5})\s*([xX*÷/])\s*(\d{1,5})\s*$")
FRACTION_OF_RE = re.compile(r"(\d+)/(\d+)\s+of\s+(\d+)", re.IGNORECASE)


def detect_topic(question: str) -> str:
    """
    Returns the most likely topic string for a given question.
    Priority: exact regex → keyword scoring → 'unknown'.
    """
    q = question.strip()

    # 1. Exact arithmetic expressions (highest confidence)
    if ADD_SUB_RE.match(q):
        m = ADD_SUB_RE.match(q)
        return "addition" if m.group(2) == "+" else "subtraction"

    if MUL_DIV_RE.match(q):
        m = MUL_DIV_RE.match(q)
        return "multiplication" if m.group(2) in ["x", "X", "*"] else "division"

    # 2. Fraction-of pattern
    if FRACTION_OF_RE.search(q):
        return "fractions"

    # 3. Keyword scoring (more hits = higher confidence)
    q_lower = q.lower()
    scores: dict[str, int] = {}
    for topic, keys in TOPIC_KEYWORDS.items():
        for k in keys:
            if k.lower() in q_lower:
                scores[topic] = scores.get(topic, 0) + 1

    if scores:
        return max(scores, key=lambda t: scores[t])

    return "unknown"
