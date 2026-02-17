import json
import time
import requests

BASE_URL = "http://127.0.0.1:1234"
ENDPOINT = "/solve-and-video-prompt"
OUT_FILE = "backend/test_results.json"

def main():
    with open("backend/test_bank.json", "r", encoding="utf-8") as f:
        cases = json.load(f)

    results = []
    for i, case in enumerate(cases, start=1):
        payload = {"grade": case["grade"], "question": case["question"]}
        print(f"[{i}/{len(cases)}] {payload}")

        r = requests.post(BASE_URL + ENDPOINT, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()

        results.append({
            "input": payload,
            "topic": data.get("topic"),
            "verified_answer": data.get("verified_answer"),
            "final_passed": data.get("final_passed"),
            "final_score": data.get("final_score"),
            "attempts": data.get("attempts", []),
            "final_prompt": data.get("final_prompt", "")
        })

        time.sleep(0.3)  # small delay

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nSaved results to {OUT_FILE}")

if __name__ == "__main__":
    main()
