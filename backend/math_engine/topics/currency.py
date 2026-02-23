"""
backend/math_engine/topics/currency.py
Deterministic solver for money/currency problems.
Detects taka, pound, dollar, rupee, euro.
"""
import re
from typing import Optional

# "Sadia has 50 taka. She buys a pen for 15 taka. How much left?"
CURRENCY_SYMBOLS = r"(?:taka|৳|tk|pound|£|dollar|\$|rupee|₹|euro|€|BDT|GBP|USD)"
# "X taka + Y taka / X - Y"
SIMPLE_MONEY_RE = re.compile(
    r"(\d+(?:\.\d{1,2})?)\s*" + CURRENCY_SYMBOLS + r".*?(\d+(?:\.\d{1,2})?)\s*" + CURRENCY_SYMBOLS,
    re.IGNORECASE,
)
CHANGE_RE = re.compile(
    r"(\d+(?:\.\d{1,2})?)\s*" + CURRENCY_SYMBOLS + r".*?(?:buy|cost|spend|spent|pay|paid|price).*?(\d+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)
HAS_RE = re.compile(r"(?:has|had|have|earned|received|given|saved)\s+([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
BUY_RE = re.compile(r"(?:buy|buys|cost|costs|price|pays?|paid|spends?|spent)\s+.*?([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
# Keywords that signal the answer should be a remainder (subtraction context)
SUBTRACT_CLUE_RE = re.compile(
    r"\b(left|remaining|change|how much left|how much remain|how much does he have|how much money|left over|leftover)\b",
    re.IGNORECASE,
)


def _detect_currency_name(question: str) -> str:
    q = question.lower()
    mapping = {"taka": "taka", "৳": "taka", "pound": "pound", "£": "pound",
               "dollar": "dollar", "$": "dollar", "rupee": "rupee", "₹": "rupee",
               "euro": "euro", "€": "euro"}
    for k, v in mapping.items():
        if k in q:
            return v
    return "taka"


def solve_currency(question: str) -> Optional[dict]:
    q = question.strip()
    currency = _detect_currency_name(q)

    # Detect "has X, buys Y, how much left" pattern → subtraction
    has_m = HAS_RE.search(q)
    buy_m = BUY_RE.search(q)
    if has_m and buy_m:
        total = float(has_m.group(1))
        spent = float(buy_m.group(1))
        if spent <= total:
            change = round(total - spent, 2)
            change_str = str(int(change)) if change == int(change) else str(change)
            return {
                "topic": "currency",
                "answer": f"{change_str} {currency}",
                "steps": [
                    {"title": "What we have", "text": f"Total money: {int(total) if total == int(total) else total} {currency}."},
                    {"title": "What we spend", "text": f"We spend {int(spent) if spent == int(spent) else spent} {currency}."},
                    {"title": "Find the change", "text": f"{int(total) if total == int(total) else total} - {int(spent) if spent == int(spent) else spent} = {change_str} {currency}."},
                ],
                "smaller_example": "Smaller example: 50 taka - 15 taka = 35 taka",
            }

    # Simple two-amount: add or subtract depending on context
    m = SIMPLE_MONEY_RE.search(q)
    if m:
        a, b = float(m.group(1).replace(",", "")), float(m.group(2).replace(",", ""))
        currency = _detect_currency_name(q)
        if SUBTRACT_CLUE_RE.search(q):
            # "had 250 taka, spent 85 taka, how much left?" → 250 - 85
            bigger, smaller = (a, b) if a >= b else (b, a)
            result = round(bigger - smaller, 2)
            result_str = str(int(result)) if result == int(result) else str(result)
            return {
                "topic": "currency",
                "answer": f"{result_str} {currency}",
                "steps": [
                    {"title": "Starting amount", "text": f"We start with {int(bigger) if bigger == int(bigger) else bigger} {currency}."},
                    {"title": "Amount spent", "text": f"We spend {int(smaller) if smaller == int(smaller) else smaller} {currency}."},
                    {"title": "Find the remainder", "text": f"{int(bigger) if bigger == int(bigger) else bigger} - {int(smaller) if smaller == int(smaller) else smaller} = {result_str} {currency}."},
                ],
                "smaller_example": "Smaller example: 50 taka - 15 taka = 35 taka",
            }
        else:
            total = round(a + b, 2)
            total_str = str(int(total)) if total == int(total) else str(total)
            return {
                "topic": "currency",
                "answer": f"{total_str} {currency}",
                "steps": [
                    {"title": "Two amounts", "text": f"We have {a} {currency} and {b} {currency}."},
                    {"title": "Add them", "text": f"{a} + {b} = {total_str} {currency}."},
                    {"title": "Answer", "text": f"Total: {total_str} {currency}."},
                ],
                "smaller_example": "Smaller example: 30 taka + 20 taka = 50 taka",
            }

    return None
