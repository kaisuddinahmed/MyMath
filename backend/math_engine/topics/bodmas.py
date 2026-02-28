"""
backend/math_engine/topics/bodmas.py
Deterministic solver for Order of Operations (BODMAS / PEMDAS).
"""
import re
from typing import Optional, List, Dict

BODMAS_KEYWORDS = ["bodmas", "order of operations", "evaluate", "simplify", "calculate"]

def solve_bodmas(question: str) -> Optional[dict]:
    # Check if bodmas-related
    q_lower = question.lower()
    
    # Extract the math expression part
    # Look for numbers, operators (+, -, *, x, /, ÷), and brackets
    expr_match = re.search(r"([0-9+\-*/xX÷()[\]{} ]+)", question)
    if not expr_match:
        return None
        
    expr = expr_match.group(1).strip()
    
    # Clean expression
    expr = expr.replace("x", "*").replace("X", "*").replace("÷", "/")
    
    # Only process if there's at least one operator and at least one set of brackets OR multiple operators
    ops = re.findall(r"[+\-*/]", expr)
    brackets = re.findall(r"[()[\]{}]", expr)
    
    if len(ops) < 2 and not brackets:
        # Not a BODMAS problem
        return None
        
    # Make sure it's valid to evaluate
    if not re.fullmatch(r"[0-9+\-*/(). ]+", expr.replace("[", "(").replace("]", ")").replace("{", "(").replace("}", ")")):
         return None

    try:
        # Evaluate to get the final answer first
        clean_expr_for_eval = expr.replace("[", "(").replace("]", ")").replace("{", "(").replace("}", ")")
        final_answer = eval(clean_expr_for_eval, {"__builtins__": {}}, {})
        if isinstance(final_answer, float) and final_answer.is_integer():
             final_answer = int(final_answer)
             
        steps = [
            {"title": "Identify the operation order", "text": "We will use BODMAS: Brackets, Orders, Division/Multiplication, then Addition/Subtraction."},
            {"title": "Solve", "text": f"Evaluate {expr} step by step according to the rules."},
            {"title": "Result", "text": f"The final answer is {final_answer}."}
        ]
        
        return {
            "topic": "bodmas",
            "answer": str(final_answer),
            "steps": steps,
            "smaller_example": "Example: 2 + 3 * 4 = 2 + 12 = 14"
        }
    except Exception:
        return None
