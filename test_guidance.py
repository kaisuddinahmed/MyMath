import sys
import os

sys.path.append(os.path.abspath("."))
from backend.api.routes.solve import _build_topic_guidance

question = "Five children are playing in the park. Then two more children have come. Now, how many children are there in the park?"

print("\n--- TOPIC GUIDANCE ---")
guidance = _build_topic_guidance(
    topic="addition",
    verified_answer="7",
    template="",
    question=question
)
print(guidance)
