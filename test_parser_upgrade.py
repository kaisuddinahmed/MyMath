import json
from backend.math_engine.word_problem_parser import parse_word_problem

test_cases = [
    "Rina had 5 apples in the basket. Then she bought 3 more apples.",
    "A farmer picked 12.5 kg of tomatoes. He sold 4.2 kg at the market. How much is left?",
    "There are 24 students. The teacher split them equally into 4 groups. How many in each group?",
    "A packet has 15 stickers. How many stickers are in 3 packets?",
    "Sarah has 1 1/2 pies. John gives her 2 1/4 pies. How many pies?"
]

for t in test_cases:
    print(f"Q: {t}")
    res = parse_word_problem(t)
    print(json.dumps(res, indent=2))
    print("-" * 40)
