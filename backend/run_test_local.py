import asyncio
import sys
import json
import os

# Add the project root to sys.path so 'backend' module is found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api_server import solve_and_video_prompt
from backend.models import MathQuestion

async def main():
    with open("backend/test_bank.json", "r") as f:
        tests = json.load(f)
        
    for idx, t in enumerate(tests, 1):
        q = MathQuestion(question=t["question"], grade=t["grade"], fast_path=False)
        print(f"[{idx}/{len(tests)}] {q.grade}: {q.question}")
        try:
            res = await solve_and_video_prompt(q)
            print("  -> Success:", res.get("solver_result", {}).get("template"))
        except Exception as e:
            print("  -> Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
