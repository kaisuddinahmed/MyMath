"""Test that _force_column_narrations correctly overwrites LLM narration."""
import sys, os, json
sys.path.append(os.path.abspath("."))
from backend.api.routes.solve import _build_column_narrations, _force_column_narrations

# Simulate an LLM-generated JSON with WRONG narration (what the LLM actually does)
fake_llm_json = {
    "scenes": [
        {"action": "SHOW_COLUMN_ARITHMETIC", "equation": "1254 - 78", 
         "narration": "Let us solve 1254 minus 78."},
        {"action": "SHOW_COLUMN_ARITHMETIC", "equation": "1254 - 78",
         "narration": "In the ones column, 4 is less than 8, so we borrow. 14 minus 8 is 6."},
        {"action": "SHOW_COLUMN_ARITHMETIC", "equation": "1254 - 78",
         "narration": "For the tens, 15 subtract 7 is 8. We write 8."},  # WRONG!
        {"action": "SHOW_COLUMN_ARITHMETIC", "equation": "1254 - 78",
         "narration": "For hundreds, we borrowed, so it is now 4. 4 subtract 0 is 4."},  # WRONG!
        {"action": "SHOW_COLUMN_ARITHMETIC", "equation": "1254 - 78",
         "narration": "Thousands column. 1 minus 0 is 1."},
        {"action": "SHOW_COLUMN_ARITHMETIC", "equation": "1254 - 78 = 1176",
         "narration": "The answer is 1176."},
    ]
}

print("=== BEFORE overwrite ===")
for i, s in enumerate(fake_llm_json["scenes"]):
    print(f"Scene {i}: {s['narration']}")

print("\n=== Applying _force_column_narrations ===\n")
result = _force_column_narrations(fake_llm_json, "subtraction", "1254 - 78")

print("\n=== AFTER overwrite ===")
for i, s in enumerate(result["scenes"]):
    print(f"Scene {i}: {s['narration']}")
