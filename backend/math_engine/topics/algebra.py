"""
backend/math_engine/topics/algebra.py
Deterministic solver for basic algebraic thinking (open sentences / missing variables).
"""
import re
from typing import Optional

def solve_algebra(question: str) -> Optional[dict]:
    # Looking for a missing variable equation like x + 5 = 12 or 12 - box = 7
    # Pattern: (var) (op) (num) = (num) OR (num) (op) (var) = (num)
    # var can be: x, y, ?, box, [], \u25a1 (square)
    
    var_pattern = r"(x|y|z|\?|box|\[\]|□)"
    num_pattern = r"(\d+)"
    op_pattern = r"([+\-*/xX÷])"
    
    # Normalizing operators (DO NOT replace 'x' globally as it breaks variables)
    q = question.lower()
    q = q.replace("÷", "/")
    
    # Case 1: var op num = num
    # Example: x + 5 = 12
    m1 = re.search(f"{var_pattern}\\s*{op_pattern}\\s*{num_pattern}\\s*=\\s*{num_pattern}", q)
    
    # Case 2: num op var = num
    # Example: 12 - x = 7
    m2 = re.search(f"{num_pattern}\\s*{op_pattern}\\s*{var_pattern}\\s*=\\s*{num_pattern}", q)
    
    if m1:
        var, op, n1_str, n2_str = m1.groups()
        n1 = int(n1_str)
        n2 = int(n2_str)
        
        ans = None
        inv_op = ""
        inv_str = ""
        
        if op == "+":
            ans = n2 - n1
            inv_op = "-"
            inv_str = f"{n2} - {n1}"
        elif op == "-":
            ans = n2 + n1
            inv_op = "+"
            inv_str = f"{n2} + {n1}"
        elif op in ["*", "x", "X"]:
            if n1 != 0:
                ans = n2 // n1 if n2 % n1 == 0 else n2 / n1
                inv_op = "÷"
                inv_str = f"{n2} ÷ {n1}"
        elif op == "/":
            ans = n2 * n1
            inv_op = "×"
            inv_str = f"{n2} × {n1}"
            
        if ans is not None:
             steps = [
                 {"title": "Find the missing value", "text": f"We need to solve for {var} in the equation: {var} {op} {n1} = {n2}."},
                 {"title": "Use the inverse operation", "text": f"To find {var}, we do the opposite of {op}. We use {inv_op}."},
                 {"title": "Calculate", "text": f"{var} = {inv_str} = {ans}."}
             ]
             return {
                 "topic": "algebra",
                 "answer": str(ans),
                 "steps": steps,
                 "smaller_example": "Example: ? + 2 = 5 -> ? = 5 - 2 = 3"
             }
             
    if m2:
        n1_str, op, var, n2_str = m2.groups()
        n1 = int(n1_str)
        n2 = int(n2_str)
        
        ans = None
        inv_str = ""
        
        if op == "+":
            ans = n2 - n1
            inv_str = f"{n2} - {n1}"
        elif op == "-":
            ans = n1 - n2
            inv_str = f"{n1} - {n2}"
        elif op in ["*", "x", "X"]:
            if n1 != 0:
                ans = n2 // n1 if n2 % n1 == 0 else n2 / n1
                inv_str = f"{n2} ÷ {n1}"
        elif op == "/":
             if n2 != 0:
                 ans = n1 // n2 if n1 % n2 == 0 else n1 / n2
                 inv_str = f"{n1} ÷ {n2}"
                 
        if ans is not None:
             steps = [
                 {"title": "Find the missing value", "text": f"We need to solve for {var} in the equation: {n1} {op} {var} = {n2}."},
                 {"title": "Use relationships", "text": f"Think about how the numbers are connected. To find {var}, calculate {inv_str}."},
                 {"title": "Calculate", "text": f"{var} = {ans}."}
             ]
             return {
                 "topic": "algebra",
                 "answer": str(ans),
                 "steps": steps,
                 "smaller_example": "Example: 10 - ? = 6 -> ? = 10 - 6 = 4"
             }
             
    return None
