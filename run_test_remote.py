import requests
import json
import time

def main():
    try:
        with open("backend/test_bank.json", "r") as f:
            tests = json.load(f)
    except FileNotFoundError:
        print("Run from root: python run_test_remote.py")
        return

    for idx, t in enumerate(tests, 1):
        print(f"[{idx}/{len(tests)}] {t['grade']}: {t['question']}")
        try:
            r = requests.post(
                "http://127.0.0.1:8000/solve-and-video-prompt",
                json={"question": t["question"], "grade": t["grade"], "fast_path": False},
                timeout=60
            )
            data = r.json()
            template = data.get("solver_result", {}).get("template", "UNKNOWN")
            print(f"  -> Success: {template}")
        except Exception as e:
            print("  -> Error:", e)

if __name__ == "__main__":
    main()
