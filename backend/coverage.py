from backend.config import TOPIC_MAP

# Mark which topics are actually implemented with deterministic solvers today
IMPLEMENTED_SOLVERS = {
    "addition": True,
    "subtraction": True,
    "multiplication": True,
    "division": True,       # exact division only
    "fractions": True       # limited: 1/2 of N, 1/4 of N
}

def coverage_report():
    topics = []
    for topic, info in TOPIC_MAP.items():
        topics.append({
            "topic": topic,
            "min_grade": int(info.get("min_grade", 1)),
            "templates": info.get("templates", []),
            "prerequisites": info.get("prerequisites", []),
            "solver_ready": bool(IMPLEMENTED_SOLVERS.get(topic, False))
        })

    # Sort by min_grade then name
    topics.sort(key=lambda x: (x["min_grade"], x["topic"]))
    return {
        "total_topics": len(topics),
        "solver_ready_count": sum(1 for t in topics if t["solver_ready"]),
        "topics": topics
    }
