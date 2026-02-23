"""
backend/core/coverage.py — Topic coverage report.
Reports which topics have deterministic solvers implemented.
"""
from backend.core.config import TOPIC_MAP

# Reflects all currently implemented deterministic solvers.
# Update as new topic solvers are added to math_engine/topics/.
IMPLEMENTED_SOLVERS = {
    "addition":          True,   # arithmetic.py
    "subtraction":       True,   # arithmetic.py
    "multiplication":    True,   # arithmetic.py
    "division":          True,   # arithmetic.py — exact + remainder
    "fractions":         True,   # topics/fractions.py
    "place_value":       True,   # topics/place_value.py
    "comparison":        True,   # topics/comparison.py
    "counting":          True,   # topics/counting.py — includes ordinals
    "ordinals":          True,   # topics/counting.py
    "patterns":          True,   # topics/patterns.py
    "measurement":       True,   # topics/measurement.py — length/weight/volume/time
    "currency":          True,   # topics/currency.py
    "geometry":          True,   # topics/geometry.py — facts + perimeter/area
    "averages":          True,   # topics/averages.py
    "multiples_factors": True,   # topics/factors_multiples.py — factors/LCM/GCD/prime
    "decimals":          True,   # topics/decimals.py — add/sub/round
    "percentages":       True,   # topics/percentages.py — %of/what%/change
    "ratio":             True,   # topics/ratio.py — simplify/divide/unitary
    "data":              True,   # topics/data.py — mode/range
    "word_problem":      True,   # word_problem_parser.py — sentence fallback
}


def coverage_report():
    topics = []
    for topic, info in TOPIC_MAP.items():
        topics.append({
            "topic": topic,
            "min_grade": int(info.get("min_grade", 1)),
            "templates": info.get("templates", []),
            "prerequisites": info.get("prerequisites", []),
            "solver_ready": bool(IMPLEMENTED_SOLVERS.get(topic, False)),
        })

    topics.sort(key=lambda x: (x["min_grade"], x["topic"]))
    solver_ready_count = sum(1 for t in topics if t["solver_ready"])
    return {
        "total_topics": len(topics),
        "solver_ready_count": solver_ready_count,
        "coverage_pct": round(solver_ready_count / len(topics) * 100) if topics else 0,
        "topics": topics,
    }
