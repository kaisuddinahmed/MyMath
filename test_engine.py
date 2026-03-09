import sys
import os
from pprint import pprint

# Set up path so we can import from backend
sys.path.append(os.path.abspath("."))

from backend.math_engine.engine import solve
from backend.math_engine.word_problem_parser import parse_word_problem

question = "Five children are playing in the park. Then two more children have come. Now, how many children are there in the park?"

print("--- PARSE WORD PROBLEM ---")
parsed = parse_word_problem(question)
pprint(parsed)

print("\n--- SOLVE ENGINE RESULT ---")
res = solve(question, 1)
print(f"Topic: {res.topic}")
print(f"Answer: {res.answer}")
print(f"Solver used: {res.solver_used}")
print(f"Template: {res.template}")
print(f"Steps: {[s.title for s in res.steps]}")
