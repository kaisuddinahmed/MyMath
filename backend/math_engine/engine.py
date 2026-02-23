"""
backend/math_engine/engine.py
Public entrypoint for all math logic.

Usage:
    from backend.math_engine.engine import solve

Handles any primary math question (Grade 1-5). Topic detection routes to the
appropriate topic-specific solver. Word problems are parsed first. LLM fallback
is returned for truly unknown questions rather than an error.
"""
import random
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

from backend.core.config import TOPIC_MAP
from backend.math_engine.topic_detector import detect_topic
from backend.math_engine.grade_style import get_grade_style, topic_level_note
from backend.math_engine.word_problem_parser import parse_word_problem

# Topic solvers
from backend.math_engine.topics.arithmetic import (
    solve_add_sub, solve_mul_div, _steps_for_op, build_smaller_example,
)
from backend.math_engine.topics.fractions import solve_fractions
from backend.math_engine.topics.place_value import solve_place_value
from backend.math_engine.topics.comparison import solve_comparison
from backend.math_engine.topics.counting import solve_counting
from backend.math_engine.topics.patterns import solve_patterns
from backend.math_engine.topics.measurement import solve_measurement
from backend.math_engine.topics.currency import solve_currency
from backend.math_engine.topics.geometry import solve_geometry
from backend.math_engine.topics.averages import solve_averages
from backend.math_engine.topics.factors_multiples import solve_factors_multiples
from backend.math_engine.topics.decimals import solve_decimals
from backend.math_engine.topics.percentages import solve_percentages
from backend.math_engine.topics.ratio import solve_ratio
from backend.math_engine.topics.data import solve_data


# ---------------------------------------------------------------------------
# Public result types
# ---------------------------------------------------------------------------

@dataclass
class Step:
    title: str
    text: str


@dataclass
class SolveResult:
    topic: str
    answer: str
    steps: List[Step]
    smaller_example: str
    template: str
    solver_used: str = "deterministic"   # "deterministic" | "word_problem" | "unsupported"
    min_grade_for_topic: int = 1
    is_above_grade: bool = False
    meta: Dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def pick_template(topic: str) -> str:
    info = TOPIC_MAP.get(topic)
    if not info:
        return "generic"
    return random.choice(info.get("templates", ["generic"]))


def build_review(topic: str, template: str, is_above: bool, prereqs: list) -> dict:
    concept_map = {
        "addition":          "Adding means putting groups together.",
        "subtraction":       "Subtracting means taking away.",
        "multiplication":    "Multiplication means equal groups.",
        "division":          "Division means sharing equally.",
        "fractions":         "Fractions mean equal parts of a whole.",
        "place_value":       "Digits have values based on their position.",
        "comparison":        "Comparing tells us which number is greater or smaller.",
        "counting":          "Counting (and ordinals) tells us how many and in what position.",
        "patterns":          "Patterns follow a rule that repeats or grows.",
        "measurement":       "Measurement tells us how long, heavy, or how much.",
        "currency":          "Money problems use adding and subtracting.",
        "geometry":          "Geometry is about shapes, sizes, and space.",
        "averages":          "Average means sharing equally — the middle value.",
        "multiples_factors": "Factors and multiples are all about multiplication.",
        "decimals":          "Decimals are another way to write parts of a whole.",
        "percentages":       "Percent means out of 100.",
        "ratio":             "Ratio compares two quantities.",
        "data":              "Data means collecting and organizing information.",
    }
    obj_map = {
        "counters_add":    "counters/blocks",
        "counters_remove": "counters/blocks",
        "group_boxes":     "group boxes + counters",
        "sharing_groups":  "shared counters into groups",
        "fraction_pie":    "fraction pie (equal slices)",
        "fraction_bar":    "fraction bar (equal parts)",
    }
    mistake_map = {
        "addition":       "Counting too many or skipping a number.",
        "subtraction":    "Counting back the wrong number of steps.",
        "multiplication": "Making unequal groups.",
        "division":       "Not sharing equally across groups.",
        "fractions":      "Making parts that are not equal.",
        "decimals":       "Not aligning decimal points when adding/subtracting.",
        "percentages":    "Forgetting to divide by 100 first.",
    }
    prereq_text = ", ".join(prereqs) if (is_above and prereqs) else ""
    return {
        "concept":          concept_map.get(topic, "Explain the main idea simply."),
        "objects_used":     obj_map.get(template, "simple objects"),
        "prerequisite_used": prereq_text if prereq_text else "none",
        "common_mistake":  mistake_map.get(topic, "Mixing up steps."),
    }


def _dict_to_result(d: dict, topic: str, grade: int) -> SolveResult:
    """Convert a topic solver's dict output into a SolveResult."""
    info = TOPIC_MAP.get(topic, {})
    min_grade = int(info.get("min_grade", 1))
    return SolveResult(
        topic=topic,
        answer=d["answer"],
        steps=[Step(title=s["title"], text=s["text"]) for s in d.get("steps", [])],
        smaller_example=d.get("smaller_example", ""),
        template=pick_template(topic),
        solver_used="deterministic",
        min_grade_for_topic=min_grade,
        is_above_grade=grade < min_grade,
    )


# ---------------------------------------------------------------------------
# Public: solve()
# ---------------------------------------------------------------------------

def solve(question: str, grade: int, curriculum_hints: Optional[List[str]] = None) -> SolveResult:
    """
    Main entrypoint. Routes question to the correct topic solver.
    Curriculum_hints are style cues from the knowledge layer — they do not
    restrict which questions can be answered.
    """
    q = question.strip()
    info_default = TOPIC_MAP.get("addition", {})

    # --- 1. Arithmetic (regex, highest confidence) ---
    solved = solve_add_sub(q)
    if solved:
        a, op, b, ans = solved
        topic = "addition" if op == "+" else "subtraction"
        info = TOPIC_MAP.get(topic, {})
        steps = _steps_for_op(grade, a, op, b, ans)
        return SolveResult(
            topic=topic, answer=str(ans),
            steps=[Step(**s) for s in steps],
            smaller_example=build_smaller_example(op),
            template=pick_template(topic),
            min_grade_for_topic=int(info.get("min_grade", 1)),
            is_above_grade=grade < int(info.get("min_grade", 1)),
        )

    solved = solve_mul_div(q)
    if solved:
        a, op, b, ans = solved
        topic = "multiplication" if op in ["x", "X", "*"] else "division"
        info = TOPIC_MAP.get(topic, {})
        if ans is None:
            return SolveResult(
                topic=topic, answer="Cannot divide by zero.",
                steps=[Step(title="Error", text="Division by zero is not allowed.")],
                smaller_example="Example: 8 ÷ 2 = 4",
                template=pick_template(topic),
                min_grade_for_topic=int(info.get("min_grade", 1)),
                is_above_grade=grade < int(info.get("min_grade", 1)),
            )
        if isinstance(ans, tuple):
            q_val, r = ans
            ans_str = f"{q_val} remainder {r}" if r > 0 else str(q_val)
            ans_display = ans
        else:
            ans_str = str(ans)
            ans_display = ans
        steps = _steps_for_op(grade, a, op, b, ans_display)
        return SolveResult(
            topic=topic, answer=ans_str,
            steps=[Step(**s) for s in steps],
            smaller_example=build_smaller_example(op),
            template=pick_template(topic),
            min_grade_for_topic=int(info.get("min_grade", 1)),
            is_above_grade=grade < int(info.get("min_grade", 1)),
        )

    # --- 2. Topic-specific solvers (high-specificity first) ---
    topic_solvers = [
        # High-specificity pattern solvers — run FIRST (their keywords are unambiguous)
        ("fractions",           solve_fractions),
        ("multiples_factors",   solve_factors_multiples),
        ("percentages",         solve_percentages),
        ("decimals",            solve_decimals),
        ("ratio",               solve_ratio),
        ("averages",            solve_averages),
        ("measurement",         solve_measurement),
        ("geometry",            solve_geometry),
        ("data",                solve_data),
        ("currency",            solve_currency),
        ("patterns",            solve_patterns),
        ("place_value",         solve_place_value),
        # Lower-specificity — run AFTER
        ("comparison",          solve_comparison),
        ("counting",            solve_counting),
    ]

    for topic, solver_fn in topic_solvers:
        try:
            result = solver_fn(q)
            if result:
                return _dict_to_result(result, result.get("topic", topic), grade)
        except Exception:
            continue  # never crash; fall through to next solver

    # --- 3. Word problem parser fallback ---
    parsed = parse_word_problem(q)
    if parsed:
        op_map = {"+": "addition", "-": "subtraction", "×": "multiplication", "÷": "division"}
        op = parsed["operation"]
        topic = op_map.get(op, "addition")
        nums = parsed["numbers"]
        a, b = (nums[0], nums[1]) if len(nums) >= 2 else (0, 0)
        steps = [
            {"title": "Read the problem", "text": q},
            {"title": "Identify the numbers", "text": f"Numbers: {', '.join(str(n) for n in nums)}."},
            {"title": "Choose the operation", "text": f"Operation: {op} ({topic})."},
            {"title": "Calculate", "text": f"{parsed['expression']} = {parsed['answer']}."},
        ]
        return SolveResult(
            topic=topic,
            answer=parsed["answer"],
            steps=[Step(**s) for s in steps],
            smaller_example=f"Expression: {parsed['expression']} = {parsed['answer']}",
            template=pick_template(topic),
            solver_used="word_problem",
            min_grade_for_topic=1,
            is_above_grade=False,
        )

    # --- 4. Detect topic for LLM video prompt context, even if unsupported ---
    detected_topic = detect_topic(q)
    info = TOPIC_MAP.get(detected_topic, {})
    min_grade = int(info.get("min_grade", 1))

    return SolveResult(
        topic=detected_topic if detected_topic != "unknown" else "general",
        answer="This question will be handled by our AI assistant.",
        steps=[Step(
            title="AI-assisted explanation",
            text="Our solver is being expanded. The AI will explain this concept.",
        )],
        smaller_example="",
        template=pick_template(detected_topic if detected_topic != "unknown" else "addition"),
        solver_used="unsupported",
        min_grade_for_topic=min_grade,
        is_above_grade=grade < min_grade,
    )
