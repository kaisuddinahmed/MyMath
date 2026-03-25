"""
backend/math_engine/word_problem_parser.py
Lightweight sentence-level parser for word problems.
Extracts: numbers, operation type, and a direct expression where possible.
Upgraded to support multi-step context Extraction: object, location, actors, actions.
Maintains backward compatibility.
"""
import re
from typing import Optional, List, Dict, Any, Union

# --- Keyword Groups for Operations ---
ADD_WORDS = [
    "more", "together", "sum", "combined", "plus", "added", "add",
    "increased by", "in total", "altogether", "in all", "how many in all",
    "came", "joined", "collected", "bought", "received", "found",
    "how many children", "how many guests", "how many people",
    "do they have", "does he have", "does she have", "total",
    r"re:\bgives\s+(him|her|me|them|us)\b(?!\s+(boy|girl|brother|sister|mother|father|friend|teacher|student))",
    r"re:\bgave\s+(him|her|me|them|us)\b(?!\s+(boy|girl|brother|sister|mother|father|friend|teacher|student))"
]

SUB_WORDS = [
    "less", "fewer", "left", "remain", "left now", "difference", "minus",
    "subtract", "took", "take away", "taking from", "taken from",
    "fly away", "flew away", "ate", "eaten",
    "gave away", "gave", "give away", "spent", "lost", "removed",
    "decreased by", "how many more", "how many less", "how many fewer",
    "wrote", "written on", "broken", "sold", "dropped", "drank",
    "have now", "left to", "left with", "left in", "are left",
    "from those", "from them", "deduct", "out of",
    "how many boys", "how many girls",
]

# Division phrases that contain 'each' must be checked BEFORE bare 'each'.
DIV_WORDS = [
    "divided", "shared equally", "share equally", "equally among", "equally between",
    "split equally", "split into", "distribute", "how many in each", "how many does each",
    "how many per", "per person", "per team", "per group", "per student",
    "in each team", "in each group", "in each row", "in each box",
    "each team gets", "each group gets", "each person gets", "each student gets",
    "into equal", "into groups of", "make equal groups", "teams of equal",
    "makes.*teams", "makes.*groups", 
    "how many each", "each get", "each share", "half", "third", "quarter",
]

MUL_WORDS = [
    "times", "groups of", "multiplied", "product", "double", "triple", "twice",
    "rows of", "arrays of", "each", "in all the",
    "how many.*are in"
]

# --- Keyword Groups for Context ---
ACTOR_WORDS = {"children", "students", "friends", "boys", "girls", "people", "teacher", "farmer", "worker", "he", "she", "they", "i", "we", "you"}
ACTION_WORDS = {"bought", "ate", "gave", "shared", "took", "collected", "sold", "found", "lost", "made", "built", "picked", "drank", "spent", "earned"}

# Regex for numbers: e.g. "12", "12.5", "1/2", "1 1/2"
# Note: we catch fractions and mixed numbers like "1 1/2" or "3/4"
NUMBERS_RE = re.compile(r"\b(\d+(?:\.\d+)|\d+\s+\d+/\d+|\d+/\d+|\d+)\b")
FRACTION_RE = re.compile(r"^(\d+)\s+(\d+)/(\d+)$")
SIMPLE_FRAC_RE = re.compile(r"^(\d+)/(\d+)$")


def _parse_number(num_str: str) -> float:
    """Safely parse integer, float, fraction, or mixed number to float."""
    ns = num_str.strip()
    if not ns:
        return 0.0
    
    match_mixed = FRACTION_RE.match(ns)
    if match_mixed:
        w, n, d = match_mixed.groups()
        return float(w) + (float(n) / float(d))
    
    match_frac = SIMPLE_FRAC_RE.match(ns)
    if match_frac:
        n, d = match_frac.groups()
        return float(n) / float(d)
        
    try:
        return float(ns)
    except ValueError:
        return 0.0


def _format_number(val: float) -> Union[int, float]:
    """Return int if it's a whole number, else float."""
    # We round floats slightly to avoid 0.30000000000000004
    val = round(val, 6)
    return int(val) if val.is_integer() else val


def extract_context(q: str) -> Dict[str, Any]:
    """Extract heuristic context from question (actors, locations, objects, actions)."""
    ctx = {"object": None, "location": None, "actors": [], "action": None}
    words = re.findall(r"\w+", q)
    lower_q = q.lower()
    
    # Simple proper noun actor extraction for capitalized words not at start of sentence
    actors = set()
    sentences = re.split(r'[.!?]+', q)
    for sent in sentences:
        sent_words = sent.strip().split()
        if not sent_words:
            continue
        for w in sent_words[1:]:
            # Strip punctuation
            w_clean = re.sub(r'[^A-Za-z]', '', w)
            if w_clean.istitle() and w_clean.lower() not in {"i"}:
                actors.add(w_clean)
                
    # Check actor common nouns
    for w in words:
        wl = w.lower()
        if wl in ACTOR_WORDS:
            actors.add(wl)
        if wl in ACTION_WORDS and not ctx["action"]:
            ctx["action"] = wl

    # Objects: Look at word right after numbers.
    object_matches = set()
    for match in re.finditer(r"\b\d+(?:\.\d+)?\s+([a-zA-Z]{3,15})\b", q):
        obj_word = match.group(1).lower()
        if obj_word not in ACTOR_WORDS and obj_word not in {"more", "less", "times", "total"}:
            object_matches.add(obj_word)
    
    # Location: After "in the", "on the", "at the", "to the", "from the"
    loc_match = re.search(r"\b(in|on|at|to|from)\s+the\s+([a-zA-Z]{3,15})\b", lower_q)
    if loc_match:
        ctx["location"] = loc_match.group(2)
        
    ctx["actors"] = list(actors)[:3] # Keep top 3
    if object_matches:
        ctx["object"] = list(object_matches)[0] # Just take the first common object
        
    return ctx

def detect_operation(q: str, nums_count: int = 2) -> Optional[str]:
    """Detect math operation from keywords, resolving ambiguities."""
    # Priority: Subtraction triggers first (how many more/left)
    op = None
    if re.search(r"how many more|left(?! to)|have now|remain", q):
        op = "-"

    if not op:
         # Division compound phrases — specific enough to win over bare keywords
        for w in DIV_WORDS:
            if ".*" in w:
                if re.search(w, q):
                    op = "÷"
                    break
            elif w in q:
                op = "÷"
                break
                
    if not op and "each" in q:
        if re.search(r"(how many|how much).{0,30}(in each|per|each\s+\w+\?)", q):
            op = "÷"
        elif re.search(r"each\s+\w+\s+(has|have|had|contains|holds|cost|costs|hold)", q):
            op = "×"

    if not op:
        for w in MUL_WORDS:
            if ".*" in w:
                if re.search(w, q):
                    op = "×"
                    break
            elif w in q:
                op = "×"
                break

    if not op:
        for w in ADD_WORDS:
            if w.startswith("re:"):
                if re.search(w[3:], q):
                    op = "+"
                    break
            elif w in q:
                op = "+"
                break

    if not op:
        for w in SUB_WORDS:
            if w in q:
                op = "-"
                break

    return op


def build_expression(nums: List[float], op: str) -> tuple[str, float]:
    """Safely build expression string and eval answer."""
    if not op or len(nums) < 2:
        return "", 0.0
        
    n = [_format_number(x) for x in nums]
    
    if op == '+':
        ans = sum(nums)
        expr = " + ".join(str(x) for x in n)
    elif op == '-':
        # Standard: largest - sum of smaller.
        # But usually just 2 numbers.
        if len(nums) == 2:
            large, small = max(nums), min(nums)
            n_large, n_small = max(n), min(n)
            expr = f"{n_large} - {n_small}"
            ans = large - small
        else:
            ans = nums[0]
            expr = f"{n[0]}"
            for x, nx in zip(nums[1:], n[1:]):
                ans -= x
                expr += f" - {nx}"
    elif op == '×':
        from math import prod
        ans = prod(nums)
        expr = " × ".join(str(x) for x in n)
    elif op == '÷':
        a, b = nums[0], nums[1]
        a_n, b_n = n[0], n[1]
        
        # If a is smaller than b and it's not a fraction question, usually we want larger / smaller
        if a < b and a > 0:
            a, b = b, a
            a_n, b_n = b_n, a_n

        if b == 0:
            return "", 0.0
        ans = a / b
        expr = f"{a_n} ÷ {b_n}"
    else:
        return "", 0.0
        
    return expr, ans

def extract_steps(q: str) -> List[Dict[str, Any]]:
    """Split multi-step paragraph into steps based on punctuation & keywords."""
    steps = []
    # Simple heuristic splitting
    parts = re.split(r'(?<=[.!?])\s+|(?=\bthen\b|\bafter\b|\bfinally\b)', q)
    for part in parts:
        if not part.strip(): continue
        
        nums_raw = NUMBERS_RE.findall(part.lower())
        if not nums_raw: continue
        
        nums = [_parse_number(x) for x in nums_raw]
        op = detect_operation(part)
        
        steps.append({
            "text": part.strip(),
            "numbers": [_format_number(n) for n in nums],
            "operation": op
        })
    return steps

def detect_part_whole(q: str) -> bool:
    """Detect if a subtraction problem is breaking a total into subsets (e.g., students -> girls/boys)."""
    # Strong signal phrases
    if re.search(r"\b(among\b.*|out of\b.*|of these\b.*|rest are\b.*)\b", q.lower()):
        return True
    return False

def parse_word_problem(question: str) -> Optional[dict]:
    """
    Returns {numbers, operation, expression, answer, confidence, ...} or None.
    Backward-compatible core schema, with new optional keys.
    """
    _WORD_MAP = {
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
        "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
        "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13",
        "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17",
        "eighteen": "18", "nineteen": "19", "twenty": "20",
    }
    
    q = question.lower().strip()
    for word, digit in sorted(_WORD_MAP.items(), key=lambda x: -len(x[0])):
        q = re.sub(rf"\b{word}\b", digit, q)
        
    nums_raw = NUMBERS_RE.findall(q)
    
    if len(nums_raw) < 2:
        return None

    nums = [_parse_number(n) for n in nums_raw]
    nums_fmt = [_format_number(n) for n in nums]

    op = detect_operation(q, len(nums))
    if not op:
        # Fallback heuristic: Try parsing the end of the sentence
        op = detect_operation(" ".join(q.split()[-5:]))
    
    if not op:
        return None

    expr, ans = build_expression(nums, op)
    if not expr:
        return None

    ans_str = str(int(ans)) if ans.is_integer() else f"{ans:.4f}".rstrip("0").rstrip(".")

    context = extract_context(question)
    steps = extract_steps(question)
    
    # We only expose steps if there is more than one distinct phase with numbers.
    valid_steps = [s for s in steps if len(s["numbers"]) > 0]
    
    result = {
        "numbers": nums_fmt,
        "operation": op,
        "expression": expr,
        "answer": ans_str,
        "confidence": "high" if len(nums) == 2 else "medium"
    }
    
    if op == "-":
        result["is_part_whole"] = detect_part_whole(question)
    
    # Merge optional fields
    result.update(context)
    if len(valid_steps) > 1:
        result["steps"] = valid_steps
        
    return result
