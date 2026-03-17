import sys
import os
from pprint import pprint

sys.path.append(os.path.abspath("."))
from backend.math_engine.engine import solve

question = "At first, Mina had 5 mangoes. Then, she was given 3 more mangoes. Now, how many mangoes does she have?"
print("Testing Question:", question)
res = solve(question, 1)
print(f"Topic: {res.topic}")
print(f"Answer: {res.answer}")
print(f"Solver used: {res.solver_used}")
print(f"Template: {res.template}")
print(f"Steps: {[s.title for s in res.steps]}")
