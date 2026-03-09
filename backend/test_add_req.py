import httpx
import sys

def test_solve():
    url = "http://localhost:1233/api/solve" # Will update port if different
    payload = {
        "text": "Mithu had 12 colour pencils. Her father gave her 4 more pencils. How many colour pencils does she have?",
        "topic": "addition",
        "concept": "Addition (11 to 20)",
        "grade": 1,
        "difficulty": 1
    }
    try:
        r = httpx.post(url, json=payload, timeout=60.0)
        print("Status code:", r.status_code)
        print("Response:", r.json())
    except Exception as e:
        print("Error:", e)
        
if __name__ == "__main__":
    test_solve()
