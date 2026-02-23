"""
backend/api/routes/analytics.py
Activity log and analytics endpoints.
"""
from fastapi import APIRouter
from typing import List, Optional
from backend.api.schemas import ActivityRecord
from backend.knowledge.activity import load_activity_records
from backend.core.coverage import coverage_report

router = APIRouter()


@router.get("/coverage")
def get_coverage():
    return coverage_report()


@router.get("/activity", response_model=List[ActivityRecord])
def get_activity(child_id: Optional[str] = None, limit: int = 20):
    records = load_activity_records()
    if child_id:
        records = [r for r in records if r.get("child_id") == child_id]
    limit = max(1, min(limit, 200))
    return records[-limit:][::-1]


@router.get("/analytics/summary")
def analytics_summary():
    """Aggregate quality metrics across all activity records."""
    records = load_activity_records()
    if not records:
        return {"total": 0, "avg_score": 0, "topics": {}}
    total = len(records)
    avg_score = sum(r.get("score", 0) for r in records) / total
    topic_counts: dict = {}
    for r in records:
        t = r.get("topic", "unknown")
        topic_counts[t] = topic_counts.get(t, 0) + 1
    return {
        "total": total,
        "avg_score": round(avg_score, 1),
        "topics": topic_counts,
    }


@router.get("/analytics/topics")
def analytics_topics():
    """Per-topic metrics."""
    records = load_activity_records()
    topics: dict = {}
    for r in records:
        t = r.get("topic", "unknown")
        if t not in topics:
            topics[t] = {"count": 0, "total_score": 0}
        topics[t]["count"] += 1
        topics[t]["total_score"] += r.get("score", 0)
    result = []
    for t, stats in topics.items():
        result.append({
            "topic": t,
            "count": stats["count"],
            "avg_score": round(stats["total_score"] / stats["count"], 1),
        })
    result.sort(key=lambda x: x["count"], reverse=True)
    return result
