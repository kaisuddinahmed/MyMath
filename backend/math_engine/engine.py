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
from backend.math_engine.topics.bodmas import solve_bodmas
from backend.math_engine.topics.algebra import solve_algebra
from backend.math_engine.topics.number_properties import solve_number_properties


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
# MCQ Solver
# ---------------------------------------------------------------------------

def _eval_expression(expr: str):
    """Evaluate a simple math expression string. Returns a number or None."""
    import re
    e = expr.strip()
    # Normalize operators
    e = e.replace("÷", "/").replace("×", "*").replace("x", "*").replace("X", "*")
    # Remove commas in numbers like 3,000
    e = re.sub(r"(\d),(\d)", r"\1\2", e)
    try:
        # Only evaluate safe arithmetic expressions
        if re.fullmatch(r"[0-9 +\-*/().]+", e):
            result = eval(e, {"__builtins__": {}}, {})
            return int(result) if float(result) == int(result) else float(result)
    except Exception:
        pass
    return None


def _solve_mcq(question: str):
    """
    Detect and solve MCQ questions: numbered (1. 2. 3. 4.) or lettered (a) b) c) d)).
    Returns a dict compatible with SolveResult, or None if not MCQ.
    """
    import re
    q = question.strip()

    # Detect the MCQ style and extract stem + options
    # Numbered: "1. option 2. option" or "1) option 2) option"
    numbered_re = re.compile(r"(\d)[\s.\)]\s*(.+?)(?=\s+\d[\s.\)]|$)", re.DOTALL)
    # Lettered: "a. option b. option" or "a) option b) option"
    lettered_re = re.compile(r"\b([a-d])[\s.\)]\s*(.+?)(?=\s+[a-d][\s.\)]|$)", re.DOTALL | re.IGNORECASE)

    options_raw = {}
    # Try numbered first: match option markers in format "1. " or "1) " (NOT bare "4 ")
    # Stray digits inside expressions (like "700 + 4 ") must NOT be matched as option markers
    option_markers_re = re.compile(r"(?<![.\d])([1-9])\s*[.)]\s+(?=[^\s])", re.IGNORECASE)
    marker_positions = [(m.group(1), m.start(), m.end()) for m in option_markers_re.finditer(q)]
    # Only proceed if we see at least two consecutive numeric markers (1, 2, ...)
    consecutive = [marker_positions[i] for i in range(len(marker_positions) - 1)
                   if int(marker_positions[i][0]) + 1 == int(marker_positions[i+1][0])]
    if len(consecutive) >= 1 and len(marker_positions) >= 2:
        # Slice the question between each pair of consecutive markers
        for idx, (num, start, end) in enumerate(marker_positions):
            next_start = marker_positions[idx + 1][1] if idx + 1 < len(marker_positions) else len(q)
            val = q[end:next_start].strip()
            options_raw[num] = val
    else:
        let_matches = lettered_re.findall(q)
        if len(let_matches) >= 2:
            for letter, val in let_matches:
                options_raw[letter.lower()] = val.strip()

    if not options_raw:
        return None

    # Determine target value from stem
    # Look for pattern: "not equal to X?", "equal to X?", "which is X?"
    q_lower = q.lower()
    not_equal = "not equal" in q_lower or "not the same" in q_lower
    equal_mode = "which" in q_lower and "equal" in q_lower

    # Extract target number from stem (i.e. from before the first option marker)
    # Find position of the first numbered option like "1." or "1)"
    first_option_marker = re.search(r"(?<!\d)\s+1[\s.)]\s*\S", q)
    stem = q[:first_option_marker.start()].strip() if first_option_marker else q
    
    # Pick the largest number in the stem (most likely to be the target like 3704, not a 1-digit like "3")
    all_nums = re.findall(r"\b(\d[\d,]*)\b", stem)
    target = None
    if all_nums:
        # Pick the single most-mentioned / largest number (strips commas first)
        target = max(int(n.replace(",", "")) for n in all_nums)

    if target is None:
        return None  # Can't solve without a target number

    # Evaluate each option
    evaluated = {}  # option_key -> (text, computed_value, matches_target)
    for key, val in options_raw.items():
        # Try to evaluate as math expression
        computed = _eval_expression(val)
        if computed is None:
            # Try to extract a number from textual options like "200 more than 3604"
            more_match = re.search(r"(\d[\d,]*)\s+more than\s+(\d[\d,]*)", val, re.I)
            less_match = re.search(r"(\d[\d,]*)\s+less than\s+(\d[\d,]*)", val, re.I)
            thousands_match = re.search(r"(\d+)\s+thousands?[,\s]+(\d+)\s+hundreds?(?:[,\s]+and\s+|\s+)(\d*)\s*(?:tens?[,\s]+)?(\d+)\s+ones?", val, re.I)
            plain_num = re.fullmatch(r"[\d,]+", val.strip())
            if more_match:
                a = int(more_match.group(1).replace(",", ""))
                b = int(more_match.group(2).replace(",", ""))
                computed = b + a
            elif less_match:
                a = int(less_match.group(1).replace(",", ""))
                b = int(less_match.group(2).replace(",", ""))
                computed = b - a
            elif thousands_match:
                thousands_v = int(thousands_match.group(1)) * 1000
                hundreds_v = int(thousands_match.group(2)) * 100
                tens_v = int(thousands_match.group(3)) * 10 if thousands_match.group(3) else 0
                ones_v = int(thousands_match.group(4)) if thousands_match.group(4) else 0
                computed = thousands_v + hundreds_v + tens_v + ones_v
            elif plain_num:
                computed = int(val.strip().replace(",", ""))
        evaluated[key] = (val, computed, computed == target if computed is not None else None)

    if not_equal:
        # Find the option that does NOT equal the target
        incorrect = [(k, v, c) for k, (v, c, m) in evaluated.items() if m is False and c is not None]
        correct_ones = [(k, v, c) for k, (v, c, m) in evaluated.items() if m is True and c is not None]
        if incorrect:
            winner_key, winner_val, winner_computed = incorrect[0]
            steps = [
                Step(title="Identify the target", text=f"The question asks which option is NOT equal to {target}."),
            ]
            for k, (v, c, m) in evaluated.items():
                status = "✓ equals" if m else ("✗ does NOT equal" if m is False else "Could not compute")
                steps.append(Step(title=f"Option {k}", text=f"{v} → {c if c is not None else '?'}. {status} {target}."))
            steps.append(Step(title="Answer", text=f"Option {winner_key}: '{winner_val}' = {winner_computed}, which is NOT equal to {target}."))
            return {
                "answer": f"Option {winner_key}: {winner_val}",
                "steps": [{"title": s.title, "text": s.text} for s in steps],
                "topic": "place_value",
                "smaller_example": f"e.g. Which is NOT equal to 100? → 90 + 20 = 110 ✗",
            }
    else:
        # Find options that DO equal the target
        correct = [(k, v, c) for k, (v, c, m) in evaluated.items() if m is True and c is not None]
        if correct:
            winner_key, winner_val, winner_computed = correct[0]
            steps = [
                Step(title="Identify the target", text=f"The question asks which option equals {target}."),
            ]
            for k, (v, c, m) in evaluated.items():
                status = "✓ equals" if m else ("✗ does not equal" if m is False else "Could not compute")
                steps.append(Step(title=f"Option {k}", text=f"{v} → {c if c is not None else '?'}. {status} {target}."))
            return {
                "answer": f"Option {winner_key}: {winner_val}",
                "steps": [{"title": s.title, "text": s.text} for s in steps],
                "topic": "place_value",
                "smaller_example": f"e.g. Which equals 100? → 50 + 50 = 100 ✓",
            }

    return None  # Could not determine the answer


# ---------------------------------------------------------------------------
# Public: solve()
# ---------------------------------------------------------------------------

def solve(
    question: str,
    grade: int,
    curriculum_hints: Optional[List[str]] = None,
    pre_solved_answer: Optional[str] = None,
    pre_solved_steps: Optional[List[str]] = None,
) -> SolveResult:
    """
    Main entrypoint. Routes question to the correct topic solver.
    If pre_solved_answer is provided (from LLM extraction), it is used directly as a fast path.
    """
    q = question.strip()

    # --- Step -1. LLM pre-solved fast path (from extraction pipeline) ---
    if pre_solved_answer:
        detected = detect_topic(q)
        info = TOPIC_MAP.get(detected, {})
        steps = [Step(title=s.split(":", 1)[0].strip() if ":" in s else "Step", text=s) for s in (pre_solved_steps or [])]
        if not steps:
            steps = [Step(title="Answer", text=pre_solved_answer)]
        return SolveResult(
            topic=detected if detected != "unknown" else "general",
            answer=pre_solved_answer,
            steps=steps,
            smaller_example="",
            template=pick_template(detected if detected != "unknown" else "addition"),
            solver_used="llm_pre_solved",
            min_grade_for_topic=int(info.get("min_grade", 1)),
            is_above_grade=grade < int(info.get("min_grade", 1)),
        )

    # --- 0. MCQ solver (must run first to prevent MCQ options polluting other solvers) ---
    mcq_result = _solve_mcq(q)
    if mcq_result:
        return _dict_to_result(mcq_result, mcq_result.get("topic", "place_value"), grade)

    # --- 0.5 High-priority structural interceptors (Algebra, BODMAS) ---
    alg_result = solve_algebra(q)
    if alg_result:
        return _dict_to_result(alg_result, "algebra", grade)
        
    bod_result = solve_bodmas(q)
    if bod_result:
        return _dict_to_result(bod_result, "bodmas", grade)

    # --- 1. Arithmetic (regex, highest confidence) ---
    solved = solve_add_sub(q)
    if solved:
        a, op, b, ans, template = solved
        topic = "addition" if op in ("+", "decomp") else "subtraction"
        info = TOPIC_MAP.get(topic, {})
        steps = _steps_for_op(grade, a, op, b, ans)
        return SolveResult(
            topic=topic, answer=str(ans),
            steps=[Step(**s) for s in steps],
            smaller_example=build_smaller_example(op),
            template=template,
            min_grade_for_topic=int(info.get("min_grade", 1)),
            is_above_grade=grade < int(info.get("min_grade", 1)),
        )

    solved = solve_mul_div(q)
    if solved:
        a, op, b, ans, template = solved
        topic = "multiplication" if op in ["x", "X", "*"] else "division"
        info = TOPIC_MAP.get(topic, {})
        if ans is None:
            return SolveResult(
                topic=topic, answer="Cannot divide by zero.",
                steps=[Step(title="Error", text="Division by zero is not allowed.")],
                smaller_example="Example: 8 ÷ 2 = 4",
                template=template,
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
            template=template,
            min_grade_for_topic=int(info.get("min_grade", 1)),
            is_above_grade=grade < int(info.get("min_grade", 1)),
        )

    # --- 2. Topic-specific solvers (high-specificity first) ---
    topic_solvers = [
        # High-specificity pattern solvers — run FIRST (their keywords are unambiguous)
        ("number_properties",   solve_number_properties),
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
