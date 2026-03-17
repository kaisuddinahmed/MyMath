import sys
import os

sys.path.append(os.path.abspath("."))
from backend.api.routes.solve import _build_topic_guidance

question = "At first, Mina had 5 mangoes. Then, she was given 3 more mangoes. Now, how many mangoes does she have?"
ans = "8"

guidance = _build_topic_guidance(topic="addition", verified_answer=ans, template="count_objects", question=question)
print("--- GENERATED GUIDANCE ---")
print(guidance)
