"""
backend/knowledge/activity.py
File-based activity log. Bounded to last 300 records.
This is a lightweight audit store — not the full DB audit_logs table.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
ACTIVITY_FILE = DATA_DIR / "activity_log.json"


def load_activity_records() -> list:
    if not ACTIVITY_FILE.exists():
        return []
    raw = ACTIVITY_FILE.read_text(encoding="utf-8").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


def save_activity_records(records: list) -> None:
    ACTIVITY_FILE.write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def append_activity(child_id: str, question: str, topic: str, template: str, score: int) -> None:
    records = load_activity_records()
    records.append({
        "child_id": child_id,
        "question": question,
        "topic": topic,
        "template": template,
        "score": int(score),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    save_activity_records(records[-300:])
