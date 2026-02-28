"""
backend/math_engine/topics/number_properties.py
Deterministic solver for number properties (Even, Odd, Prime, Composite).
"""
import re
from typing import Optional

def is_prime(n: int) -> bool:
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

def solve_number_properties(question: str) -> Optional[dict]:
    q = question.lower()
    
    # Try finding a target number
    m = re.search(r"\b(\d{1,6})\b", q)
    if not m:
        return None
        
    num = int(m.group(1))
    
    is_even_q = re.search(r"\b(even|odd)\b", q)
    is_prime_q = re.search(r"\b(prime|composite)\b", q)
    
    if not is_even_q and not is_prime_q:
        return None
        
    if is_even_q:
        prop = is_even_q.group(1)
        even = (num % 2 == 0)
        actual_prop = "even" if even else "odd"
        
        # Checking "is 5 even?" vs "what is 5, even or odd?"
        if q.startswith("is") and prop in q and "or" not in q:
            # Yes/No question
            is_match = (prop == actual_prop)
            ans = "Yes" if is_match else "No"
            explanation = f"Yes, {num} is {prop}." if is_match else f"No, {num} is {actual_prop}."
        else:
            ans = actual_prop.capitalize()
            explanation = f"{num} is an {actual_prop} number."
            
        div_text = "can be divided exactly by 2" if even else "cannot be divided exactly by 2"
            
        steps = [
            {"title": "Even or Odd", "text": "Even numbers end in 0, 2, 4, 6, or 8. Odd numbers end in 1, 3, 5, 7, or 9."},
            {"title": "Check the number", "text": f"The number {num} {div_text}."},
            {"title": "Result", "text": explanation}
        ]
        
        return {
            "topic": "number_properties",
            "answer": str(ans),
            "steps": steps,
            "smaller_example": "Example: 4 is even (4÷2=2). 5 is odd (5÷2=2 rem 1)."
        }
        
    if is_prime_q:
        prop = is_prime_q.group(1)
        prime_status = is_prime(num)
        
        actual_prop = "prime" if prime_status else "composite"
        if num <= 1:
            actual_prop = "neither prime nor composite"
        
        if q.startswith("is") and prop in q:
            is_match = (prop == actual_prop)
            ans = "Yes" if is_match else "No"
            explanation = f"Yes, {num} is {prop}." if is_match else f"No, {num} is {actual_prop}."
        else:
            ans = actual_prop.capitalize()
            explanation = f"{num} is {actual_prop}."
            
        if prime_status:
            factor_text = f"{num} only has two factors: 1 and {num}."
        elif num > 1:
            factor_text = f"{num} has more than two factors."
        else:
            factor_text = "0 and 1 are special and are not prime or composite."
            
        steps = [
            {"title": "Prime or Composite", "text": "A prime number has exactly two factors: 1 and itself."},
            {"title": "Find Factors", "text": factor_text},
            {"title": "Result", "text": explanation}
        ]
        
        return {
            "topic": "number_properties",
            "answer": str(ans),
            "steps": steps,
            "smaller_example": "Example: 5 is prime. 6 is composite (2×3=6)."
        }
        
    return None
