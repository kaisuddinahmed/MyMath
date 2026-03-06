"""
backend/math_engine/topics/comparison.py
Deterministic solver for comparison questions.

Handles two distinct comparison types:
  A) Qualitative/visual comparisons (NCTB Class 1 Chapter 1):
     - More or Less  (quantity: which bowl has more rice?)
     - Small and Large (size: which ball is larger?)
     - Short and Tall (height: which tree is taller?)
     - Far and Near (distance: which object is nearer?)
     - Heavy and Light (weight: which is heavier: feather or book?)
  B) Numeric comparisons:
     - Symbols: 5 > 2, 8 < 11
     - "which is greater: 56 or 43?"
     - Ordering numbers, between
"""
import re
from typing import Optional

# ─── Numeric comparison patterns ─────────────────────────────────────────────
COMPARE_KEYWORD_RE = re.compile(
    r"\b(?:bigger|smaller|greater|less|compare|which is larger|which is more|largest|smallest)\b",
    re.IGNORECASE,
)
COMPARE_OP_RE = re.compile(r"(\d+)\s*([><]=?|==?)\s*(\d+)", re.IGNORECASE)
COMPARE_TWO_RE = re.compile(r"(\d+)\s*(?:vs\.?)\s*(\d+)", re.IGNORECASE)
ORDER_RE = re.compile(r"order.*?([\d ,]+)", re.IGNORECASE)
BETWEEN_RE = re.compile(r"between\s+(\d+)\s+and\s+(\d+)", re.IGNORECASE)

# ─── Qualitative comparison patterns ─────────────────────────────────────────
# Detects sub-concept from question keywords
QUAL_PATTERNS = {
    "heavy_light": re.compile(
        r"\b(heavier|lighter|heaviest|lightest|heavy|light|weight|weighs? more|weighs? less)\b",
        re.IGNORECASE,
    ),
    "tall_short": re.compile(
        r"\b(taller|shorter|tallest|shortest|tall|short)\b",
        re.IGNORECASE,
    ),
    "big_small": re.compile(
        r"\b(bigger|smaller|largest|smallest|large|small|big|little|size)\b",
        re.IGNORECASE,
    ),
    "far_near": re.compile(
        r"\b(farther|nearer|nearest|farthest|far|near|closer|closest|distance)\b",
        re.IGNORECASE,
    ),
    "more_less": re.compile(
        r"\b(more|less|fewer|most|least)\b",
        re.IGNORECASE,
    ),
}

# Common-knowledge object ordering tables used for deterministic answers.
# Objects earlier in the list = lighter/smaller/shorter/nearer.
# Objects later in the list = heavier/larger/taller/farther.
WEIGHT_ORDER = [
    "feather", "leaf", "flower", "paper", "pencil", "pen", "eraser",
    "rubber", "book", "notebook", "bag", "bottle", "brick", "stone",
    "mango", "apple", "orange", "jackfruit", "coconut", "pumpkin",
    "chair", "table", "bicycle", "rickshaw", "car", "bus", "truck",
]
SIZE_ORDER = [
    "seed", "button", "coin", "eraser", "ring", "pen", "pencil",
    "ruler", "book", "football", "cricket ball", "bucket", "chair",
    "bicycle", "car", "bus", "truck", "tree", "building",
]
HEIGHT_ORDER = [
    "ant", "insect", "frog", "rabbit", "cat", "dog", "child", "student",
    "adult", "ladder", "lamppost", "palm tree", "coconut tree", "building",
]


def _rank(obj: str, table: list[str]) -> int:
    """Return position of obj in a reference ordering table; -1 if unknown."""
    obj = obj.strip().lower()
    for i, item in enumerate(table):
        if obj in item or item in obj:
            return i
    return -1


def _extract_two_objects(question: str) -> tuple[str, str] | None:
    """
    Try to extract two objects being compared.
    Handles patterns like:
      "Which is heavier: a feather or a jackfruit?"
      "Which is taller — the palm tree or the coconut tree?"
      "Compare the football and the pencil"
    """
    # Pattern: "X or Y" / "X and Y" after a comparison keyword
    m = re.search(
        r"\b(?:between|compare|is|are)\b[^?]*?\ban?\s+([\w\s]+?)\s+(?:or|and)\s+an?\s+([\w\s]+?)(?:[?.,]|$)",
        question, re.IGNORECASE,
    )
    if m:
        return m.group(1).strip(), m.group(2).strip()

    # Simpler "X or Y" anywhere
    m2 = re.search(r"([\w\s]{3,30}?)\s+or\s+([\w\s]{3,30}?)(?:[?.,]|$)", question, re.IGNORECASE)
    if m2:
        return m2.group(1).strip(), m2.group(2).strip()

    return None


def _solve_qualitative(question: str) -> Optional[dict]:
    """
    Solve qualitative comparisons for NCTB Class 1 Chapter 1.
    Returns a result dict or None if unable to determine.
    """
    q = question.strip()

    # Do not attempt qualitative visual comparisons on math word problems (e.g. 5 apples and 3 more)
    # Do not attempt qualitative visual comparisons on math word problems (e.g. 5 apples and 3 more)
    import re
    # Count both digit-numbers AND written-out number words
    _NUMBER_WORDS = r"\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b"
    digit_count = len(re.findall(r"\d+", q))
    word_count = len(re.findall(_NUMBER_WORDS, q, re.IGNORECASE))
    total_numbers = digit_count + word_count
    if total_numbers >= 2:
        return None
    # Also skip if question contains clear addition indicators
    _ADDITION_INDICATORS = r"\b(altogether|in all|how many.*total|put together|combined)\b"
    if re.search(_ADDITION_INDICATORS, q, re.IGNORECASE):
        return None
    # Detect sub-concept
    sub = None
    for concept, pat in QUAL_PATTERNS.items():
        if pat.search(q):
            sub = concept
            break
    if sub is None:
        return None

    sub_labels = {
        "heavy_light": ("heavier", "lighter", "heavy", "light"),
        "tall_short": ("taller", "shorter", "tall", "short"),
        "big_small": ("larger", "smaller", "large", "small"),
        "far_near": ("farther", "nearer", "far", "near"),
        "more_less": ("more", "less", "more", "less"),
    }
    table_map = {
        "heavy_light": WEIGHT_ORDER,
        "tall_short": HEIGHT_ORDER,
        "big_small": SIZE_ORDER,
    }

    more_word, less_word, more_adj, less_adj = sub_labels[sub]

    # Try to determine which of two named objects wins
    pair = _extract_two_objects(q)
    if pair and sub in table_map:
        obj_a, obj_b = pair
        # remove leading 'the ' or 'a ' or 'an ' for lookup and display grammar
        clean_a = re.sub(r'^(the|an?)\s+', '', obj_a, flags=re.IGNORECASE)
        clean_b = re.sub(r'^(the|an?)\s+', '', obj_b, flags=re.IGNORECASE)
        rank_a = _rank(clean_a, table_map[sub])
        rank_b = _rank(clean_b, table_map[sub])
        if rank_a >= 0 and rank_b >= 0 and rank_a != rank_b:
            winner = clean_b if rank_b > rank_a else clean_a
            loser = clean_a if rank_b > rank_a else clean_b
            answer = f"The {winner} is {more_word} than the {loser}."
            return {
                "topic": "comparison",
                "sub_concept": sub,
                "answer": answer,
                "steps": [
                    {"title": f"Look at the two objects", "text": f"We have a {clean_a} and a {clean_b}."},
                    {"title": f"Which is {more_adj}?", "text": f"We know a {winner} is {more_adj} than a {loser}."},
                    {"title": "Answer", "text": answer},
                ],
                "smaller_example": f"Smaller example: A {table_map[sub][-3]} is {more_adj} than a {table_map[sub][1]}.",
            }

    # Fallback: can't resolve which object wins, but we know the sub-concept
    concept_explanations = {
        "more_less": "We compare quantities. 'More' means a bigger amount. 'Less' means a smaller amount.",
        "big_small": "We compare sizes. 'Large' means bigger in size. 'Small' means smaller in size.",
        "tall_short": "We compare heights. 'Tall' means higher up. 'Short' means not as high.",
        "far_near": "We compare distances. 'Near' means close to us or a reference point. 'Far' means far away.",
        "heavy_light": "We compare weights. 'Heavy' means it weighs more. 'Light' means it weighs less.",
    }
    return {
        "topic": "comparison",
        "sub_concept": sub,
        "answer": f"Compare the two objects: which is {more_adj}? That one is {more_word}.",
        "steps": [
            {"title": f"Sub-concept: {sub.replace('_', ' ').title()}", "text": concept_explanations[sub]},
            {"title": "How to compare", "text": f"Look at the two objects carefully. The {more_adj} one has {more_word}."},
            {"title": "Answer", "text": f"Point to the {more_adj} object and say '{more_adj}' or '{more_word}'."},
        ],
        "smaller_example": concept_explanations[sub],
    }


def _solve_ordering(question: str) -> Optional[dict]:
    """Solve Class 1 Chapter 3 ordering problems."""
    # "order 8, 2, 0, 4, 7" or "smaller to greater: 10, 9, 6"
    q = question.lower()
    
    # Check if this is an ordering question
    is_order = bool(re.search(r"\b(order|arrange|reorder)\b", q)) or "smaller to greater" in q or "greater to smaller" in q or "large to small" in q or "small to large" in q
    if not is_order:
        return None
        
    nums = [int(n) for n in re.findall(r"\d+", question)]
    if len(nums) < 2:
        return None
        
    descending = "greater" in q or "largest to smallest" in q or "decreasing" in q or "large to small" in q or "big to small" in q
    
    sorted_nums = sorted(nums, reverse=descending)
    ans_str = ", ".join(str(n) for n in sorted_nums)
    
    direction = "largest to smallest" if descending else "smallest to largest"
    
    return {
        "topic": "comparison",
        "sub_concept": "ordering",
        "answer": ans_str,
        "steps": [
            {"title": "Look at the numbers", "text": f"We need to order: {', '.join(str(n) for n in nums)}."},
            {"title": "Direction", "text": f"We must arrange them from {direction}."},
            {"title": "Answer", "text": f"The correct order is: {ans_str}."},
        ],
        "smaller_example": f"Smaller example: {direction} for 3, 1, 2 is {'3, 2, 1' if descending else '1, 2, 3'}.",
    }


def solve_comparison(question: str) -> Optional[dict]:
    q = question.strip()

    # ── Try ordering first (Chapter 3) ────────────────────────────────────────
    ordering = _solve_ordering(q)
    if ordering:
        return ordering

    # ── Try qualitative (Chapter 1 visual comparisons) ────────────────────────
    qual = _solve_qualitative(q)
    if qual:
        return qual

    # ── Numeric: explicit operator (>, <, =) ─────────────────────────────────
    m = COMPARE_OP_RE.search(q)
    if m:
        a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        if op in [">", "<", ">="]:
            word = "greater" if op == ">" else ("less" if op == "<" else "greater or equal")
            result = (a > b if op == ">" else (a < b if op == "<" else a >= b))
            ans = f"{a} {op} {b} is {'True' if result else 'False'}. {a} is {'' if result else 'not '}{word} than {b}."
        else:
            ans = f"{a} {'equals' if a == b else 'does not equal'} {b}."
        return {
            "topic": "comparison",
            "answer": ans,
            "steps": [
                {"title": "Look at the numbers", "text": f"We are comparing {a} and {b}."},
                {"title": "Which is bigger?", "text": f"{max(a,b)} is bigger than {min(a,b)}."},
                {"title": "Answer", "text": ans},
            ],
            "smaller_example": "Smaller example: 7 > 4 means 7 is greater than 4.",
        }

    # ── Numeric: keyword-based ────────────────────────────────────────────────
    if COMPARE_KEYWORD_RE.search(q):
        nums = re.findall(r"\d+", q)
        if len(nums) >= 2:
            a, b = int(nums[0]), int(nums[1])
            if a > b:
                desc = f"{a} is greater than {b}."
            elif b > a:
                desc = f"{b} is greater than {a}."
            else:
                desc = f"{a} and {b} are equal."
            return {
                "topic": "comparison",
                "answer": desc,
                "steps": [
                    {"title": "Compare the numbers", "text": f"We look at {a} and {b}."},
                    {"title": "Find the bigger one", "text": f"Count up: {min(a,b)} comes before {max(a,b)} on the number line."},
                    {"title": "Answer", "text": desc},
                ],
                "smaller_example": "Smaller example: 9 is greater than 6.",
            }

    # ── Numeric: X vs Y ──────────────────────────────────────────────────────
    m2 = COMPARE_TWO_RE.search(q)
    if m2:
        a, b = int(m2.group(1)), int(m2.group(2))
        desc = (f"{a} is greater than {b}." if a > b else
                f"{b} is greater than {a}." if b > a else
                f"{a} and {b} are equal.")
        return {
            "topic": "comparison",
            "answer": desc,
            "steps": [{"title": "Compare", "text": desc}],
            "smaller_example": "Smaller example: 9 is greater than 6.",
        }

    # ── Numeric: Between ────────────────────────────────────────────────────
    m3 = BETWEEN_RE.search(q)
    if m3:
        a, b = int(m3.group(1)), int(m3.group(2))
        between = list(range(min(a, b) + 1, max(a, b)))
        ans = ", ".join(str(x) for x in between) if between else "no whole numbers"
        return {
            "topic": "comparison",
            "answer": ans,
            "steps": [
                {"title": "Find the range", "text": f"We want whole numbers between {a} and {b} (not including them)."},
                {"title": "Count up", "text": f"Start at {min(a,b)+1}, stop before {max(a,b)}."},
                {"title": "Answer", "text": f"Numbers between {a} and {b}: {ans}."},
            ],
            "smaller_example": "Smaller example: numbers between 3 and 7 are 4, 5, 6.",

        }

    return None
