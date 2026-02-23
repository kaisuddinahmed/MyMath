"""
backend/math_engine/topics/factors_multiples.py
Deterministic solver for factors, multiples, LCM, GCD.
"""
import re
from math import gcd
from typing import Optional

FACTORS_RE = re.compile(r"factors?\s+of\s+(\d+)", re.IGNORECASE)
MULTIPLES_RE = re.compile(r"(?:first\s+(\d+)\s+)?multiples?\s+of\s+(\d+)", re.IGNORECASE)
LCM_RE = re.compile(r"lcm\s+of\s+(\d+)\s+and\s+(\d+)|least common multiple\s+of\s+(\d+)\s+and\s+(\d+)", re.IGNORECASE)
GCD_RE = re.compile(r"(?:gcd|hcf|highest common factor|greatest common)\s+of\s+(\d+)\s+and\s+(\d+)", re.IGNORECASE)
PRIME_RE = re.compile(r"is\s+(\d+)\s+(?:a\s+)?prime", re.IGNORECASE)


def _is_prime(n: int) -> bool:
    if n < 2: return False
    if n == 2: return True
    if n % 2 == 0: return False
    for i in range(3, int(n**0.5)+1, 2):
        if n % i == 0: return False
    return True


def solve_factors_multiples(question: str) -> Optional[dict]:
    q = question.strip()

    # Factors
    m = FACTORS_RE.search(q)
    if m:
        n = int(m.group(1))
        factors = [i for i in range(1, n+1) if n % i == 0]
        fstr = ", ".join(str(f) for f in factors)
        return {
            "topic": "multiples_factors",
            "answer": fstr,
            "steps": [
                {"title": "What are factors?", "text": f"Factors of {n} are numbers that divide {n} exactly with no remainder."},
                {"title": "Check each number", "text": f"Check 1 to {n}: which ones divide {n} evenly?"},
                {"title": "Answer", "text": f"Factors of {n}: {fstr}."},
            ],
            "smaller_example": "Smaller example: factors of 12 are 1, 2, 3, 4, 6, 12.",
        }

    # Multiples
    m = MULTIPLES_RE.search(q)
    if m:
        count = int(m.group(1)) if m.group(1) else 10
        n = int(m.group(2))
        count = min(count, 20)
        multiples = [n * i for i in range(1, count + 1)]
        mstr = ", ".join(str(x) for x in multiples)
        return {
            "topic": "multiples_factors",
            "answer": mstr,
            "steps": [
                {"title": "What are multiples?", "text": f"Multiples of {n} are the results of multiplying {n} by 1, 2, 3, 4..."},
                {"title": "List them", "text": f"{n}×1={n}, {n}×2={n*2}, {n}×3={n*3}..."},
                {"title": "Answer", "text": f"First {count} multiples of {n}: {mstr}."},
            ],
            "smaller_example": "Smaller example: multiples of 5 → 5, 10, 15, 20, 25...",
        }

    # LCM
    m = LCM_RE.search(q)
    if m:
        a = int(m.group(1) or m.group(3))
        b = int(m.group(2) or m.group(4))
        lcm = abs(a * b) // gcd(a, b)
        return {
            "topic": "multiples_factors",
            "answer": str(lcm),
            "steps": [
                {"title": "Find LCM", "text": f"LCM is the smallest number that is a multiple of both {a} and {b}."},
                {"title": "Formula", "text": f"LCM = ({a} × {b}) ÷ GCD({a},{b}) = {a*b} ÷ {gcd(a,b)}."},
                {"title": "Answer", "text": f"LCM of {a} and {b} = {lcm}."},
            ],
            "smaller_example": "Smaller example: LCM of 4 and 6 = 12",
        }

    # GCD/HCF
    m = GCD_RE.search(q)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        g = gcd(a, b)
        return {
            "topic": "multiples_factors",
            "answer": str(g),
            "steps": [
                {"title": "Find HCF/GCD", "text": f"HCF is the largest number that divides both {a} and {b} exactly."},
                {"title": "List common factors", "text": f"Factors of {a}: {', '.join(str(i) for i in range(1,a+1) if a%i==0)}. Factors of {b}: {', '.join(str(i) for i in range(1,b+1) if b%i==0)}."},
                {"title": "Answer", "text": f"HCF of {a} and {b} = {g}."},
            ],
            "smaller_example": "Smaller example: HCF of 12 and 8 = 4",
        }

    # Is prime?
    m = PRIME_RE.search(q)
    if m:
        n = int(m.group(1))
        prime = _is_prime(n)
        return {
            "topic": "multiples_factors",
            "answer": f"{'Yes' if prime else 'No'}, {n} is {'a prime number' if prime else 'not a prime number'}.",
            "steps": [
                {"title": "What is a prime?", "text": "A prime number has exactly 2 factors: 1 and itself."},
                {"title": f"Check {n}", "text": f"Does {n} divide evenly by any number other than 1 and {n}?"},
                {"title": "Answer", "text": f"{'Yes' if prime else 'No'}, {n} is {'a prime' if prime else 'not a prime'}." + (f" Its factors are only 1 and {n}." if prime else f" It divides by {next((i for i in range(2, n) if n%i==0), n)}, so it's not prime.")},
            ],
            "smaller_example": "Smaller example: 7 is prime (factors: 1, 7). 6 is not prime (factors: 1, 2, 3, 6).",
        }

    return None
