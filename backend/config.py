import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def load_json(name: str):
    path = BASE_DIR / name
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


TOPIC_MAP = load_json("topic_map.json")
GRADE_STYLE = load_json("grade_style.json")
TOPIC_KEYWORDS = load_json("topic_keywords.json")
