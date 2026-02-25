from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import re

BASE_DIR = Path(__file__).resolve().parent
PROFILE_DIR = BASE_DIR / "curriculum_profiles"


def _load_json_file(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def load_curriculum_policy(curriculum: str, class_level: int) -> Dict[str, Any]:
    curriculum_key = (curriculum or "").strip().lower()
    if not curriculum_key:
        return {}
    path = PROFILE_DIR / curriculum_key / f"class_{int(class_level)}.json"
    return _load_json_file(path)


def list_available_policies() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    if not PROFILE_DIR.exists():
        return rows
    for p in PROFILE_DIR.glob("*/class_*.json"):
        curriculum = p.parent.name
        m = re.match(r"class_(\d+)\.json$", p.name)
        if not m:
            continue
        rows.append({
            "curriculum": curriculum,
            "class_level": int(m.group(1)),
            "path": str(p),
        })
    rows.sort(key=lambda x: (x["curriculum"], x["class_level"]))
    return rows


def resolve_curriculum_policy(curriculum: str, class_level: int, default_curriculum: str = "nctb") -> Dict[str, Any]:
    target_curriculum = (curriculum or "").strip().lower() or default_curriculum
    policy = load_curriculum_policy(target_curriculum, class_level)
    if policy:
        return policy
    if target_curriculum != default_curriculum:
        fallback = load_curriculum_policy(default_curriculum, class_level)
        if fallback:
            fallback = dict(fallback)
            fallback["_fallback_from"] = target_curriculum
            return fallback
    return {}


def _as_int(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None


def _safe_format(message: str, **kwargs: Any) -> str:
    try:
        return message.format(**kwargs)
    except Exception:
        return message


def extract_number_literals(question: str) -> List[int]:
    q = question or ""
    return [int(x) for x in re.findall(r"\d+", q)]

def extract_decimal_literals(question: str) -> List[float]:
    q = question or ""
    vals: List[float] = []
    for x in re.findall(r"\b\d+\.\d+\b", q):
        try:
            vals.append(float(x))
        except ValueError:
            continue
    return vals

def extract_fraction_literals(question: str) -> List[str]:
    q = question or ""
    return [f"{a}/{b}" for a, b in re.findall(r"\b(\d+)\s*/\s*(\d+)\b", q)]


def validate_question_scope(
    policy: Dict[str, Any],
    *,
    question: str,
    topic: str,
    solved_op: Optional[str] = None,
    solved_answer: Optional[int] = None,
    a: Optional[int] = None,
    b: Optional[int] = None,
) -> Optional[str]:
    if not policy:
        return None

    messages = policy.get("messages", {}) if isinstance(policy.get("messages"), dict) else {}
    constraints = policy.get("constraints", {}) if isinstance(policy.get("constraints"), dict) else {}
    topic_constraints = policy.get("topic_constraints", {}) if isinstance(policy.get("topic_constraints"), dict) else {}

    allow_fractions = constraints.get("allow_fractions", True)
    if not bool(allow_fractions) and topic == "fractions":
        default_msg = "Fractions are out of scope for this class."
        template = messages.get("fraction_out_of_scope", default_msg)
        return _safe_format(
            template,
            topic=topic,
            class_level=policy.get("class_level", ""),
            curriculum=policy.get("curriculum", ""),
        )
    if bool(allow_fractions) and topic == "fractions":
        frac_rules = topic_constraints.get("fractions", {}) if isinstance(topic_constraints.get("fractions"), dict) else {}
        allowed_visual = frac_rules.get("allowed_visual_fractions")
        if isinstance(allowed_visual, list) and allowed_visual:
            literals = extract_fraction_literals(question)
            if literals and not all(x in allowed_visual for x in literals):
                default_msg = "Please use allowed class fractions."
                template = messages.get("fraction_out_of_scope", default_msg)
                return _safe_format(
                    template,
                    class_level=policy.get("class_level", ""),
                    curriculum=policy.get("curriculum", ""),
                )

    allow_decimals = constraints.get("allow_decimals", True)
    if not bool(allow_decimals):
        decimal_literals = extract_decimal_literals(question)
        # Currency may use decimal notation in some curricula; keep this open only for currency.
        if decimal_literals and topic != "currency":
            default_msg = "Decimals are out of scope for this class."
            template = messages.get("decimal_out_of_scope", default_msg)
            return _safe_format(
                template,
                class_level=policy.get("class_level", ""),
                curriculum=policy.get("curriculum", ""),
            )

    topics_in_scope = policy.get("topics_in_scope")
    if isinstance(topics_in_scope, list) and topic and topic != "unknown" and topic not in topics_in_scope:
        default_msg = "This topic is outside the current class syllabus."
        template = messages.get("out_of_scope_topic", default_msg)
        return _safe_format(
            template,
            topic=topic,
            class_level=policy.get("class_level", ""),
            curriculum=policy.get("curriculum", ""),
        )

    max_number = _as_int(constraints.get("max_number"))
    if max_number is not None:
        values = extract_number_literals(question)
        if solved_answer is not None:
            values.append(abs(int(solved_answer)))
        if any(v > max_number for v in values):
            default_msg = "This is advanced for this class level."
            template = messages.get("max_number_exceeded", default_msg)
            return _safe_format(
                template,
                max_number=max_number,
                class_level=policy.get("class_level", ""),
                curriculum=policy.get("curriculum", ""),
            )

    subtraction_rules = topic_constraints.get("subtraction", {}) if isinstance(topic_constraints.get("subtraction"), dict) else {}
    min_result = _as_int(subtraction_rules.get("min_result"))
    allow_negative = bool(constraints.get("allow_negative", True))
    if solved_op == "-" and solved_answer is not None:
        if (not allow_negative and solved_answer < 0) or (min_result is not None and solved_answer < min_result):
            default_msg = "We cannot subtract to get a negative result."
            template = messages.get("negative_subtraction", default_msg)
            return _safe_format(template, a=a if a is not None else "", b=b if b is not None else "", result=solved_answer)

    addition_rules = topic_constraints.get("addition", {}) if isinstance(topic_constraints.get("addition"), dict) else {}
    addition_max_sum = _as_int(addition_rules.get("max_sum"))
    enforce_addition_max = bool(addition_rules.get("enforce_globally", False))
    if enforce_addition_max and solved_op == "+" and solved_answer is not None and addition_max_sum is not None:
        if solved_answer > addition_max_sum:
            default_msg = "This sum is above the current topic limit."
            template = messages.get("addition_too_large", default_msg)
            return _safe_format(template, max_sum=addition_max_sum, result=solved_answer)

    counting_rules = topic_constraints.get("counting", {}) if isinstance(topic_constraints.get("counting"), dict) else {}
    counting_min = _as_int(counting_rules.get("min"))
    counting_max = _as_int(counting_rules.get("max"))
    if topic == "counting" and (counting_min is not None or counting_max is not None):
        for v in extract_number_literals(question):
            if counting_min is not None and v < counting_min:
                template = messages.get("counting_range", "Counting is out of allowed range.")
                return _safe_format(template, min_value=counting_min, max_value=counting_max if counting_max is not None else "")
            if counting_max is not None and v > counting_max:
                template = messages.get("counting_range", "Counting is out of allowed range.")
                return _safe_format(template, min_value=counting_min if counting_min is not None else "", max_value=counting_max)

    ordinal_rules = topic_constraints.get("ordinal_numbers", {}) if isinstance(topic_constraints.get("ordinal_numbers"), dict) else {}
    ordinal_min = _as_int(ordinal_rules.get("min"))
    ordinal_max = _as_int(ordinal_rules.get("max"))
    if topic == "ordinal_numbers" and (ordinal_min is not None or ordinal_max is not None):
        vals = extract_number_literals(question)
        if vals:
            pos = vals[0]
            if ordinal_min is not None and pos < ordinal_min:
                template = messages.get("ordinal_range", "Ordinal position is out of allowed range.")
                return _safe_format(template, min_value=ordinal_min, max_value=ordinal_max if ordinal_max is not None else "")
            if ordinal_max is not None and pos > ordinal_max:
                template = messages.get("ordinal_range", "Ordinal position is out of allowed range.")
                return _safe_format(template, min_value=ordinal_min if ordinal_min is not None else "", max_value=ordinal_max)

    multiplication_rules = topic_constraints.get("multiplication", {}) if isinstance(topic_constraints.get("multiplication"), dict) else {}
    table_min = _as_int(multiplication_rules.get("table_min"))
    table_max = _as_int(multiplication_rules.get("table_max"))
    if solved_op in {"x", "X", "*"} and (table_min is not None or table_max is not None):
        factors = [v for v in [a, b] if isinstance(v, int)]
        for f in factors:
            if table_min is not None and f < table_min:
                template = messages.get("times_table_range", "Multiplication table is out of allowed range.")
                return _safe_format(template, min_value=table_min, max_value=table_max if table_max is not None else "")
            if table_max is not None and f > table_max:
                template = messages.get("times_table_range", "Multiplication table is out of allowed range.")
                return _safe_format(template, min_value=table_min if table_min is not None else "", max_value=table_max)

    division_rules = topic_constraints.get("division", {}) if isinstance(topic_constraints.get("division"), dict) else {}
    allow_div_by_zero = bool(division_rules.get("allow_division_by_zero", True))
    if solved_op in {"/", "÷"} and b is not None and b == 0 and not allow_div_by_zero:
        template = messages.get("division_by_zero", "Division by zero is impossible.")
        return _safe_format(template)

    return None
