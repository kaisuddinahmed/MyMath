"""
backend/video/narration/nctb/class_1.py
========================================
Deterministic narration builder for NCTB Class 1 (age ~6).

Receives a SolveResult and returns an ordered list[NarrationBeat].
No LLM. No guidance strings. Directly produces scene data.

Topics covered:
  comparison   — quantity / attribute / greater_smaller
  counting     — small (1-10) / large (11-100)
  numbers      — words / range / next_previous / order / rearrange
  addition     — small_word / small_abstract / medium / story
  subtraction  — small / medium / comparison / part_whole / story
  geometry     — shape_properties / real_object
  patterns     — object_pattern / number_pattern
  currency     — count_total / which_notes

Pedagogy rules (Class 1):
  - No > or < symbols anywhere
  - No number lines
  - Plain words only in equations
  - Count in groups of 10 for numbers 11-100
  - Animate items (birds, butterflies): wave + fly; inanimate: fade/dissolve
  - Items persist across beats within a flow
  - Celebration is always the final beat (added by router)
"""
from __future__ import annotations
import re
from typing import Optional

from backend.video.narration.base import NarrationBeat


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ANIMATE_ITEM_TYPES = {
    "BIRD_SVG", "BUTTERFLY_SVG", "CHILD_SVG", "CAT_SVG", "HEN_SVG",
    "COCK_SVG", "CROW_SVG", "PEACOCK_SVG", "RABBIT_SVG", "HORSE_SVG",
    "ELEPHANT_SVG", "TIGER_SVG", "MAGPIE_SVG", "HILSA_FISH_SVG",
}

# Keyword → item_type mapping (longer phrases first to avoid partial matches)
ITEM_TYPE_HINTS: list[tuple[str, str]] = [
    ("colour pencil", "PENCIL_SVG"), ("color pencil",  "PENCIL_SVG"),
    ("colour pencils","PENCIL_SVG"), ("color pencils", "PENCIL_SVG"),
    ("butterfly",     "BUTTERFLY_SVG"), ("butterflies",   "BUTTERFLY_SVG"),
    ("brinjal",       "BRINJAL_SVG"),  ("brinjals",      "BRINJAL_SVG"),
    ("chocolate",     "CHOCOLATE_SVG"),("chocolates",    "CHOCOLATE_SVG"),
    ("pineapple",     "PINEAPPLE_SVG"),("balloon",       "BALLOON_SVG"),
    ("balloons",      "BALLOON_SVG"),  ("peacock",       "PEACOCK_SVG"),
    ("rabbit",        "RABBIT_SVG"),   ("marble",        "MARBLE_SVG"),
    ("marbles",       "MARBLE_SVG"),   ("flower",        "FLOWER_SVG"),
    ("flowers",       "FLOWER_SVG"),   ("tomato",        "TOMATO_SVG"),
    ("tomatoes",      "TOMATO_SVG"),   ("banana",        "BANANA_SVG"),
    ("bananas",       "BANANA_SVG"),   ("guava",         "GUAVA_SVG"),
    ("mango",         "MANGO_SVG"),    ("mangoes",       "MANGO_SVG"),
    ("apple",         "APPLE_SVG"),    ("apples",        "APPLE_SVG"),
    ("pencil",        "PENCIL_SVG"),   ("pencils",       "PENCIL_SVG"),
    ("book",          "BOOK_SVG"),     ("books",         "BOOK_SVG"),
    ("rose",          "ROSE_SVG"),     ("roses",         "ROSE_SVG"),
    ("bird",          "BIRD_SVG"),     ("birds",         "BIRD_SVG"),
    ("boat",          "BOAT_SVG"),     ("boats",         "BOAT_SVG"),
    ("fish",          "HILSA_FISH_SVG"),("cat",          "CAT_SVG"),
    ("hen",           "HEN_SVG"),      ("hens",          "HEN_SVG"),
    ("egg",           "EGG_SVG"),      ("eggs",          "EGG_SVG"),
    ("car",           "CAR_SVG"),      ("cars",          "CAR_SVG"),
    ("child",         "CHILD_SVG"),    ("children",      "CHILD_SVG"),
    ("girl",          "CHILD_SVG"),    ("girls",         "CHILD_SVG"),
    ("boy",           "CHILD_SVG"),    ("boys",          "CHILD_SVG"),
    ("student",       "CHILD_SVG"),    ("students",      "CHILD_SVG"),
    ("pen",           "PEN_SVG"),      ("pens",          "PEN_SVG"),
    ("leaf",          "LEAF_SVG"),     ("umbrella",      "UMBRELLA_SVG"),
    ("toy",           "STAR_SVG"),     ("toys",          "STAR_SVG"),
]

_ONES = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen",
]
_TENS = ["", "", "twenty", "thirty", "forty", "fifty",
         "sixty", "seventy", "eighty", "ninety"]

# Words that look like proper nouns but are NOT character names
_NON_NAME_WORDS = {
    "How", "What", "Where", "When", "Why", "Who", "The", "A", "An",
    "They", "He", "She", "It", "There", "This", "That", "These", "Those",
    "Shahid", "Minar", "Miner", "Bangladesh", "Dhaka",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
    "Total", "Together", "Altogether",
}

# Location keyword → display label (longer phrases first)
_LOCATION_HINTS: list[tuple[str, str]] = [
    ("shahid minar",  "Shahid Minar"),
    ("shahid miner",  "Shahid Minar"),
    ("school field",  "the school field"),
    ("river ghat",    "the river ghat"),
    ("school",        "school"),
    ("garden",        "the garden"),
    ("park",          "the park"),
    ("river",         "the river"),
    ("market",        "the market"),
    ("field",         "the field"),
    ("pond",          "the pond"),
    ("tree",          "the tree"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_WORD_TO_NUM: dict[str, int] = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}


def _nums(question: str) -> list[int]:
    """Extract numbers from question — handles both digit ('3') and word ('three') forms."""
    digit_nums = [int(n) for n in re.findall(r"\d+", question)]
    if digit_nums:
        return digit_nums
    # Fallback: scan for word-form numbers in order of appearance
    q = question.lower()
    found: list[tuple[int, int]] = []  # (position, value)
    for word, val in _WORD_TO_NUM.items():
        for m in re.finditer(r'\b' + re.escape(word) + r'\b', q):
            found.append((m.start(), val))
    found.sort(key=lambda x: x[0])
    return [v for _, v in found]


def _item(question: str) -> str:
    """Return the item SVG type best matching the question.

    Uses whole-word matching (\\b boundaries) to prevent false hits like
    'hen' matching inside 'then', or 'pen' matching inside 'pencil'.
    """
    q = question.lower()
    for kw, itype in ITEM_TYPE_HINTS:
        if re.search(r'\b' + re.escape(kw) + r'\b', q):
            return itype
    return "BLOCK_SVG"


def _animate(item_type: str) -> bool:
    return item_type.upper() in ANIMATE_ITEM_TYPES


def _n2w(n: int) -> str:
    if n == 0:
        return "zero"
    if n < 20:
        return _ONES[n]
    if n < 100:
        t = _TENS[n // 10]
        o = _ONES[n % 10]
        return f"{t}-{o}" if o else t
    return "one hundred"


def _word_problem(question: str) -> bool:
    q = question.lower()
    return any(w in q for w in [
        "had", "have", "has", "there are", "there were", "were", "came",
        "went", "bought", "gave", "took", "flew", "sitting", "playing",
        "picked", "plucked", "caught", "anchored", "bloomed", "scored",
        "left", "brought", "come", "placed",
    ])


def _detect_attribute(question: str) -> tuple[str, str]:
    q = question.lower()
    for kw, adj, cat in [
        ("taller",  "taller",  "height"), ("shorter", "shorter", "height"),
        ("tall",    "taller",  "height"), ("short",   "shorter", "height"),
        ("heavier", "heavier", "weight"), ("lighter", "lighter", "weight"),
        ("heavy",   "heavier", "weight"), ("light",   "lighter", "weight"),
        ("larger",  "bigger",  "size"),   ("bigger",  "bigger",  "size"),
        ("smaller", "smaller", "size"),   ("big",     "bigger",  "size"),
        ("small",   "smaller", "size"),   ("far",     "farther", "distance"),
        ("near",    "nearer",  "distance"),("longer", "longer",  "length"),
        ("long",    "longer",  "length"),
    ]:
        if kw in q:
            return adj, cat
    return "different", "size"


# ---------------------------------------------------------------------------
# Story context parsers (used by word-problem narration builders)
# ---------------------------------------------------------------------------

def _extract_names(question: str) -> list[str]:
    """Return up to 2 character names found in the question (deterministic, no LLM).

    Strategy:
    1. First look for the explicit "Name and Name" pattern — most Class 1 problems
       introduce both characters this way (e.g. "Ratul and Mitu have come...").
    2. Fall back to scanning all capitalised words, skipping sentence-initial words
       that are capitalised purely by grammar.
    """
    # Pass 1: "Name and Name" — most reliable signal
    m = re.search(r'\b([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\b', question)
    if m:
        n1, n2 = m.group(1), m.group(2)
        if n1 not in _NON_NAME_WORDS and n2 not in _NON_NAME_WORDS:
            return [n1, n2]

    # Pass 2: scan all capitalised words, skip sentence-initial and known non-names
    sentence_starts: set[str] = set()
    for sentence in re.split(r'[.!?]\s+', question):
        first = sentence.strip().split()
        if first:
            sentence_starts.add(first[0].strip('",'))

    names: list[str] = []
    seen: set[str] = set()
    for word in question.split():
        clean = word.strip('.,!?";()')
        if (
            clean
            and clean[0].isupper()
            and len(clean) > 1
            and clean not in _NON_NAME_WORDS
            and clean not in sentence_starts
            and not clean.isdigit()
        ):
            if clean not in seen:
                seen.add(clean)
                names.append(clean)
        if len(names) == 2:
            break
    return names


def _extract_location(question: str) -> Optional[str]:
    """Return a display label for the setting if a known location keyword is found."""
    q = question.lower()
    for kw, label in _LOCATION_HINTS:
        if kw in q:
            return label
    return None


def _joining_beats(question: str, a: int, b: int, item_plural: str) -> Optional[tuple[str, str]]:
    """Return (beat0_text, beat1_text) if the question describes a past-tense joining scenario.

    Detects patterns like "X birds were sitting in a tree. Then Y more birds sat there."
    Returns None if the question is not a recognisable joining scenario.
    """
    q = question.lower()
    is_past = any(w in q for w in ["were", "was", "had", "sat", "flew", "came", "placed"])
    has_then = any(w in q for w in ["then", "later", "after that"])
    if not (is_past and has_then):
        return None

    location = _extract_location(question)
    loc_phrase = ""
    if location:
        # Places you go "to" vs. places things are "in"
        at_locs = {"school", "Shahid Minar", "the park", "the market", "the field"}
        prep = "at" if location in at_locs else "in"
        loc_phrase = f" {prep} {location}"

    beat0 = f"There were {a} {item_plural}{loc_phrase}."
    beat1 = f"Then {b} more {item_plural} came to join them."
    return beat0, beat1


def _assign_char_numbers(question: str, names: list[str]) -> dict[str, int]:
    """Map each name to the number that appears closest after it in the question."""
    assignments: dict[str, int] = {}
    for name in names:
        m = re.search(rf'\b{re.escape(name)}\b[^.]*?(\d+)', question)
        if m:
            assignments[name] = int(m.group(1))
    return assignments


# ---------------------------------------------------------------------------
# Subtype detector
# ---------------------------------------------------------------------------

def _detect_subtype(topic: str, question: str, is_part_whole: bool) -> str:
    q = question.lower()
    numbers = _nums(question)

    if topic == "comparison":
        adj, _ = _detect_attribute(question)
        if adj != "different":
            return "attribute"
        if any(w in q for w in ["how many more", "how many less", "how many fewer",
                                  "more than", "fewer than"]):
            return "quantity"
        if len(numbers) >= 2:
            return "greater_smaller"
        return "quantity"

    if topic == "counting":
        total = numbers[0] if numbers else 5
        return "small" if total <= 10 else "large"

    if topic == "numbers":
        if any(w in q for w in ["arrange", "rearrange", "ways", "different way"]):
            return "rearrange"
        if any(w in q for w in ["order", "ascending", "descending",
                                  "smallest to", "largest to"]):
            return "order"
        if any(w in q for w in ["next", "after", "previous", "before"]):
            return "next_previous"
        if any(w in q for w in ["word", "words", "write in word",
                                  "write the number in"]):
            return "words"
        if any(w in q for w in ["count from", "write from",
                                  "numbers from", "count numbers"]):
            return "range"
        return "words"

    if topic == "addition":
        if any(w in q for w in ["create a story", "write a story", "make a story"]):
            return "story"
        s = sum(numbers[:2]) if len(numbers) >= 2 else (numbers[0] if numbers else 5)
        if s <= 10:
            return "small_word" if _word_problem(question) else "small_abstract"
        if s <= 20:
            return "medium"
        return "large"

    if topic == "subtraction":
        if any(w in q for w in ["create a story", "write a story", "make a story"]):
            return "story"
        if any(w in q for w in ["how many more", "how many less", "how many fewer",
                                  "how much more", "how much less"]):
            return "comparison"
        if is_part_whole:
            return "part_whole"
        minuend = max(numbers[:2]) if len(numbers) >= 2 else (numbers[0] if numbers else 7)
        if minuend <= 10:
            return "small"
        if minuend <= 20:
            return "medium"
        return "large"

    if topic == "geometry":
        real_kws = ["book", "board", "glass", "plate", "window", "door",
                    "clock", "coin", "ball", "box", "table", "chair", "wheel"]
        if any(kw in q for kw in real_kws):
            return "real_object"
        return "shape_properties"

    if topic == "patterns":
        return "number_pattern" if len(_nums(question)) >= 3 else "object_pattern"

    if topic == "currency":
        if any(w in q for w in ["buy", "which note", "which coin",
                                  "which taka", "pay for", "purchase"]):
            return "which_notes"
        return "count_total"

    return "default"


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def build(solve_result) -> list[NarrationBeat]:
    """
    Main entry point called by narration/router.py.
    Returns list[NarrationBeat] (without the final Celebration — router adds it).
    """
    topic    = getattr(solve_result, "topic", "addition")
    question = getattr(solve_result, "question", "")
    answer   = getattr(solve_result, "answer", "")
    is_pw    = getattr(solve_result, "is_part_whole", False)

    subtype = _detect_subtype(topic, question, is_pw)

    builder = _DISPATCH.get((topic, subtype))
    if builder is None:
        # Fallback for unimplemented subtypes — single equation scene
        return [NarrationBeat(
            text=f"The answer is {answer}.",
            action="SHOW_EQUATION",
            equation=str(answer),
        )]

    return builder(question, answer)


# ---------------------------------------------------------------------------
# Topic 1: Comparison
# ---------------------------------------------------------------------------

def _comparison_quantity(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    a, b = (nums[0], nums[1]) if len(nums) >= 2 else (7, 3)
    larger = max(a, b)
    smaller = min(a, b)
    itype = _item(question)
    return [
        NarrationBeat(text=f"Look! Here are {a} {itype.replace('_SVG','').lower()}s.", action="ADD_ITEMS", item_type=itype, items_count=a),
        NarrationBeat(text=f"And here are {b} {itype.replace('_SVG','').lower()}s.", action="ADD_ITEMS", item_type=itype, items_count=b),
        NarrationBeat(
            text="Let's see who has more! Look, this side is jumping higher!",
            action="HIGHLIGHT",
            item_type=itype,
        ),
        NarrationBeat(
            text=f"Yay! {larger} has more than {smaller}!",
            action="SHOW_EQUATION",
            equation=f"{larger} has more than {smaller}",
        ),
    ]


def _comparison_attribute(question: str, answer: str) -> list[NarrationBeat]:
    adj, cat = _detect_attribute(question)
    return [
        NarrationBeat(text="Ready? Let's look at these two things!", action="ADD_ITEMS", item_type="BLOCK_SVG", items_count=2),
        NarrationBeat(
            text=f"Wow! Look how {adj} this one is! See the difference?",
            action="HIGHLIGHT",
        ),
        NarrationBeat(text=answer, action="SHOW_EQUATION", equation=answer),
    ]


def _comparison_greater_smaller(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    n, m = (nums[0], nums[1]) if len(nums) >= 2 else (7, 4)
    larger, smaller = max(n, m), min(n, m)
    return [
        NarrationBeat(
            text=f"Let us imagine {n} boxes for {n} and {m} boxes for {m}. Watch them build!",
            action="ADD_ITEMS",
            item_type="BLOCK_SVG",
            items_count=n + m,
        ),
        NarrationBeat(
            text=f"{larger} has more boxes. {larger} is greater!",
            action="HIGHLIGHT",
            item_type="BLOCK_SVG",
        ),
        NarrationBeat(
            text=f"{larger} is greater. {smaller} is smaller.",
            action="SHOW_EQUATION",
            equation=f"{larger} is greater. {smaller} is smaller.",
        ),
    ]


# ---------------------------------------------------------------------------
# Topic 2: Counting
# ---------------------------------------------------------------------------

def _counting_small(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    total = nums[0] if nums else 5
    itype = _item(question)
    count_str = ", ".join(str(i) for i in range(1, total + 1))
    return [
        NarrationBeat(
            text=f"{count_str}! There are {total}.",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=total,
        ),
        NarrationBeat(
            text=f"Let us check again! {count_str}. Yes, {total}!",
            action="HIGHLIGHT",
            item_type=itype,
        ),
        NarrationBeat(
            text=f"There are {total} in total!",
            action="SHOW_EQUATION",
            equation=f"There are {total} in total.",
        ),
    ]


def _counting_large(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    total = nums[0] if nums else 20
    groups = total // 10
    remainder = total % 10
    itype = _item(question)
    beats: list[NarrationBeat] = [
        NarrationBeat(
            text=f"Let us count all these. There are many!",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=total,
        ),
        NarrationBeat(
            text=f"Let us make groups of ten! " + " ".join(
                f"Group {i}: that is {i * 10}!" for i in range(1, groups + 1)
            ),
            action="GROUP_ITEMS",
            item_type=itype,
            extra={"groups": groups, "per_group": 10},
        ),
    ]
    if remainder:
        beats.append(NarrationBeat(
            text=f"And {remainder} more. {', '.join(str(i) for i in range(1, remainder+1))}.",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=remainder,
        ))
    beats.append(NarrationBeat(
        text=f"{groups} groups of ten and {remainder} ones. So there are {total} in all!",
        action="SHOW_EQUATION",
        equation=f"{groups} tens and {remainder} ones equals {total}.",
    ))
    return beats


# ---------------------------------------------------------------------------
# Topic 3: Numbers
# ---------------------------------------------------------------------------

def _numbers_words(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    n = nums[0] if nums else 5
    word_form = _n2w(n)
    return [
        NarrationBeat(
            text=f"The number is {n}.",
            action="SHOW_EQUATION",
            equation=str(n),
        ),
        NarrationBeat(
            text=f"We write {n} as {word_form}.",
            action="SHOW_EQUATION",
            equation=f"{n} = {word_form}",
        ),
    ]


def _numbers_range(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    start = nums[0] if len(nums) >= 2 else 1
    end   = nums[1] if len(nums) >= 2 else 10
    count = end - start + 1
    return [
        NarrationBeat(
            text=f"Let us count from {start} to {end}!",
            action="SHOW_EQUATION",
            equation=f"Let us count from {start} to {end}.",
        ),
        NarrationBeat(
            text=f"{start}... {start+1}... all the way to {end}!",
            action="ADD_ITEMS",
            item_type="COUNTER",
            items_count=count,
        ),
        NarrationBeat(
            text=f"These are all the numbers from {start} to {end}. Well done!",
            action="SHOW_EQUATION",
            equation=f"{start} to {end}",
        ),
    ]


def _numbers_next_previous(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    n = nums[0] if nums else 5
    q = question.lower()
    is_next = any(w in q for w in ["next", "after"])
    answer_n = n + 1 if is_next else n - 1
    direction = "next" if is_next else "previous"
    if is_next:
        eq = f"{answer_n} comes after {n}."
        scene2 = NarrationBeat(
            text=f"One more comes! Now count: 1, 2... {answer_n}!",
            action="ADD_ITEMS",
            item_type="BLOCK_SVG",
            items_count=1,
        )
    else:
        eq = f"{answer_n} comes before {n}."
        scene2 = NarrationBeat(
            text=f"One block leaves. Now count what is left: 1, 2... {answer_n}.",
            action="REMOVE_ITEMS",
            item_type="BLOCK_SVG",
            items_count=1,
        )
    return [
        NarrationBeat(
            text=f"We have {n}. Let us count: 1, 2, 3... {n}.",
            action="ADD_ITEMS",
            item_type="BLOCK_SVG",
            items_count=n,
        ),
        scene2,
        NarrationBeat(
            text=f"The {direction} number is {answer_n}!",
            action="SHOW_EQUATION",
            equation=eq,
        ),
    ]


def _numbers_order(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    q = question.lower()
    asc = any(w in q for w in ["ascending", "smallest to", "smaller to greater"])
    order_words = "smallest to biggest" if asc else "biggest to smallest"
    sorted_nums = sorted(nums, reverse=not asc)
    return [
        NarrationBeat(
            text=f"We have these numbers: {', '.join(str(x) for x in nums)}. Let us put them in order!",
            action="SHOW_EQUATION",
            equation=f"Numbers: {', '.join(str(x) for x in nums)}",
        ),
        NarrationBeat(
            text=f"First comes {sorted_nums[0]}. Then {sorted_nums[1]}...",
            action="SHOW_NUMBER_ORDERING",
            extra={"numbers": nums, "order_type": "ASCENDING" if asc else "DESCENDING"},
        ),
        NarrationBeat(
            text=f"From {order_words}: {', '.join(str(x) for x in sorted_nums)}!",
            action="SHOW_EQUATION",
            equation=f"From {order_words}: {' '.join(str(x) for x in sorted_nums)}",
        ),
    ]


def _numbers_rearrange(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    n = nums[0] if nums else 9
    combos = [(n - k, k) for k in range(1, n // 2 + 1)]
    itype = _item(question)
    beats: list[NarrationBeat] = [
        NarrationBeat(
            text=f"We have {n} objects. Let us see different ways to group them!",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=n,
        ),
    ]
    for a, b in combos:
        beats.append(NarrationBeat(
            text=f"{a} and {b}.",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=n,
        ))
    beats.append(NarrationBeat(
        text=f"{n} objects can be grouped in {len(combos)} different ways!",
        action="SHOW_EQUATION",
        equation=f"{n} can be shown in {len(combos)} ways.",
    ))
    return beats


# ---------------------------------------------------------------------------
# Topic 4: Addition
# ---------------------------------------------------------------------------

def _addition_small_word(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    a = nums[0] if len(nums) >= 2 else 3
    b = nums[1] if len(nums) >= 2 else 2
    total = a + b
    itype = _item(question)
    item_plural = itype.replace('_SVG', '').lower() + 's'
    count_str = ', '.join(str(i) for i in range(1, total + 1))

    # --- Try to extract story context (characters + location) ---
    names = _extract_names(question)
    location = _extract_location(question)
    assignments = _assign_char_numbers(question, names) if len(names) >= 2 else {}

    if len(names) >= 2 and len(assignments) >= 1:
        # 7-beat story structure — characters and setting woven into narration
        char1, char2 = names[0], names[1]
        n1 = assignments.get(char1, a)
        n2 = assignments.get(char2, b)
        loc_text = f" to {location}" if location else ""
        return [
            NarrationBeat(                                              # beat 0 — setting
                text=f"{char1} and {char2} have come{loc_text} with {item_plural}.",
                action="SHOW_SMALL_ADDITION",
                equation=f"{a} + {b}",
                item_type=itype,
                mode="story",
            ),
            NarrationBeat(                                              # beat 1 — group 1 pops
                text=f"{char1} has brought {n1} {item_plural}.",
                action="SHOW_SMALL_ADDITION",
                equation=f"{a} + {b}",
                item_type=itype,
                mode="story",
            ),
            NarrationBeat(                                              # beat 2 — group 2 pops
                text=f"And {char2} has brought {n2} more {item_plural}. We need to find the total.",
                action="SHOW_SMALL_ADDITION",
                equation=f"{a} + {b}",
                item_type=itype,
                mode="story",
            ),
            NarrationBeat(                                              # beat 3 — + sign appears
                text="That is why this is an addition problem. Let us put them all together.",
                action="SHOW_SMALL_ADDITION",
                equation=f"{a} + {b}",
                item_type=itype,
                mode="story",
            ),
            NarrationBeat(                                              # beat 4 — merge
                text="Here they come.",
                action="SHOW_SMALL_ADDITION",
                equation=f"{a} + {b}",
                item_type=itype,
                mode="story",
            ),
            NarrationBeat(                                              # beat 5 — count aloud
                text=f"Let us count together: {count_str}.",
                action="SHOW_SMALL_ADDITION",
                equation=f"{a} + {b}",
                item_type=itype,
                mode="story",
            ),
            NarrationBeat(                                              # beat 6 — equation
                text=f"So {a} plus {b} equals {total}.",
                action="SHOW_SMALL_ADDITION",
                equation=f"{a} + {b} = {total}",
                item_type=itype,
                mode="story",
            ),
        ]

    # --- Fallback: 5-beat joining structure (no named characters detected) ---
    # Try to extract a "then more came" story context from the question.
    joining = _joining_beats(question, a, b, item_plural)
    beat0_text = joining[0] if joining else f"Look! Here are {a} {item_plural}."
    beat1_text = joining[1] if joining else f"And here are {b} more {item_plural}."

    return [
        NarrationBeat(                                                  # beat 0 — group 1 pops
            text=beat0_text,
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type=itype,
            mode="joining",
        ),
        NarrationBeat(                                                  # beat 1 — group 2 pops
            text=beat1_text,
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type=itype,
            mode="joining",
        ),
        NarrationBeat(                                                  # beat 2 — + sign / concept
            text="We need to find the total. This is an addition problem!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type=itype,
            mode="joining",
        ),
        NarrationBeat(                                                  # beat 3 — merge
            text="Let's put them all together. Here they come!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type=itype,
            mode="joining",
        ),
        NarrationBeat(                                                  # beat 4 — count + equation
            text=f"Let's count together: {count_str}! So {a} plus {b} equals {total}!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b} = {total}",
            item_type=itype,
            mode="joining",
        ),
    ]


def _addition_small_abstract(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    a = nums[0] if len(nums) >= 2 else 3
    b = nums[1] if len(nums) >= 2 else 2
    total = a + b
    count_str = ', '.join(str(i) for i in range(1, total + 1))
    return [
        NarrationBeat(                                                  # beat 0 — group 1 pops
            text=f"Look! {a} blocks here.",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type="BLOCK_SVG",
            mode="abstract",
        ),
        NarrationBeat(                                                  # beat 1 — group 2 pops / + sign
            text=f"And {b} more blocks coming!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type="BLOCK_SVG",
            mode="abstract",
        ),
        NarrationBeat(                                                  # beat 2 — merge
            text="This is an addition problem. Let's put them together!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type="BLOCK_SVG",
            mode="abstract",
        ),
        NarrationBeat(                                                  # beat 3 — count + equation
            text=f"Let's count together: {count_str}! {a} plus {b} equals {total}!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b} = {total}",
            item_type="BLOCK_SVG",
            mode="abstract",
        ),
    ]


def _addition_medium(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    a = nums[0] if len(nums) >= 2 else 12
    b = nums[1] if len(nums) >= 2 else 5
    total = a + b
    itype = _item(question)
    return [
        NarrationBeat(
            text=f"Look! We have {a} {itype.replace('_SVG','').lower()}s.",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=1,
            extra={"label": str(a)},
        ),
        NarrationBeat(
            text=f"{b} more are joining. Let's add them!",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=1,
            extra={"label": str(b)},
        ),
        NarrationBeat(
            text=f"Ready? Let's add {a} and {b} together!",
            action="SHOW_MEDIUM_ADDITION",
            extra={"operand1": a, "operand2": b},
        ),
        NarrationBeat(
            text=f"Yay! {a} plus {b} equals {total}!",
            action="SHOW_EQUATION",
            equation=f"{a} + {b} = {total}",
        ),
    ]


def _addition_large(question: str, answer: str) -> list[NarrationBeat]:
    """Column addition for any sum > 20.

    Emits one beat per step so VerticalGrid's stepDurations map correctly:
      beat 0  → setup      (write numbers in columns)
      beat 1  → ones col
      beat 2  → tens col
      beat N  → final carry column (only if carry out of last digit)
      beat N+1→ final equation
    """
    nums = _nums(question)
    a = nums[0] if len(nums) >= 2 else 145
    b = nums[1] if len(nums) >= 2 else 90
    total = a + b
    num_digits = max(len(str(a)), len(str(b)))
    _PLACE_NAMES = ["ones", "tens", "hundreds", "thousands"]

    def _digit(n: int, place: int) -> int:
        return (n // (10 ** place)) % 10

    def _col_narration(place: int, d1: int, d2: int, carry_in: int) -> tuple[str, int]:
        """Return (narration_text, carry_out) for a single column."""
        col_sum = d1 + d2 + carry_in
        result  = col_sum % 10
        carry_out = col_sum // 10
        place_name = _PLACE_NAMES[place] if place < len(_PLACE_NAMES) else f"{10**place}s"

        carry_phrase = f" plus {carry_in} we carried" if carry_in > 0 else ""
        if carry_out > 0:
            text = (f"{place_name.capitalize()}: {d1} plus {d2}{carry_phrase} "
                    f"equals {col_sum}. Write {result}, carry {carry_out}.")
        else:
            text = (f"{place_name.capitalize()}: {d1} plus {d2}{carry_phrase} "
                    f"equals {col_sum}. Write {result}.")
        return text, carry_out

    # Beat 0 — setup
    beats: list[NarrationBeat] = [
        NarrationBeat(
            text=f"Let us add {a} and {b}. We write them one below the other in columns.",
            action="SHOW_COLUMN_ARITHMETIC",
            equation=f"{a} + {b}",
        ),
    ]

    # One beat per column (ones → tens → hundreds → …)
    carry = 0
    for place in range(num_digits):
        d1 = _digit(a, place)
        d2 = _digit(b, place)
        narration, carry = _col_narration(place, d1, d2, carry)
        beats.append(NarrationBeat(
            text=narration,
            action="SHOW_COLUMN_ARITHMETIC",
            equation=f"{a} + {b}",
        ))

    # Final carry column (e.g. 99+11 → extra "1" in thousands place)
    if carry > 0:
        beats.append(NarrationBeat(
            text=f"We still have {carry} carried over. Write it in the next column.",
            action="SHOW_COLUMN_ARITHMETIC",
            equation=f"{a} + {b}",
        ))

    # Final equation beat
    beats.append(NarrationBeat(
        text=f"So {a} plus {b} equals {total}!",
        action="SHOW_COLUMN_ARITHMETIC",
        equation=f"{a} + {b} = {total}",
    ))

    return beats


def _addition_story(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    a = nums[0] if len(nums) >= 2 else 3
    b = nums[1] if len(nums) >= 2 else 2
    total = a + b
    itype = _item(question)
    return [
        NarrationBeat(
            text=f"Let's make a fun story for {a} plus {b}!",
            action="SHOW_EQUATION",
            equation=f"Story for {a} + {b}",
        ),
        NarrationBeat(
            text=f"Look! Here are {a} {itype.replace('_SVG','').lower()}s.",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type=itype,
            mode="joining",
        ),
        NarrationBeat(
            text=f"{b} more are coming to join them!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b}",
            item_type=itype,
            mode="joining",
        ),
        NarrationBeat(
            text=f"Let's count together: {', '.join(str(i) for i in range(1, total+1))}! {a} plus {b} equals {total}!",
            action="SHOW_SMALL_ADDITION",
            equation=f"{a} + {b} = {total}",
            item_type=itype,
            mode="joining",
        ),
    ]


# ---------------------------------------------------------------------------
# Topic 5: Subtraction
# ---------------------------------------------------------------------------

def _subtraction_small(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    total  = nums[0] if len(nums) >= 2 else 7
    remove = nums[1] if len(nums) >= 2 else 4
    remaining = total - remove
    itype = _item(question)
    animate = _animate(itype)
    removal_text = f"{remove} wave goodbye and fly away!" if animate else f"{remove} are taken away!"
    return [
        NarrationBeat(
            text=f"Look! We start with {total} {itype.replace('_SVG','').lower()}s.",
            action="CHOREOGRAPH_SUBTRACTION",
            item_type=itype,
            extra={"choreography_total": total, "choreography_amount": remove, "choreography_environment": "PLAIN"},
        ),
        NarrationBeat(
            text="Since some are going away, this is a subtraction problem.",
            action="CHOREOGRAPH_SUBTRACTION",
            item_type=itype,
            extra={"choreography_total": total, "choreography_amount": remove, "choreography_environment": "PLAIN"},
        ),
        NarrationBeat(
            text=f"Now we take away {remove}. {removal_text} Now let's count what is left!",
            action="CHOREOGRAPH_SUBTRACTION",
            item_type=itype,
            extra={"choreography_total": total, "choreography_amount": remove, "choreography_environment": "PLAIN"},
        ),
        NarrationBeat(
            text=f"Let us count: {', '.join(str(i) for i in range(1, remaining+1))}. There are {remaining} left!",
            action="CHOREOGRAPH_SUBTRACTION",
            item_type=itype,
            extra={"choreography_total": total, "choreography_amount": remove, "choreography_environment": "PLAIN"},
        ),
        NarrationBeat(
            text=f"This can be written as {total} minus {remove} equals {remaining}.",
            action="SHOW_EQUATION",
            equation=f"{total} - {remove} = {remaining}",
        ),
    ]


def _subtraction_medium(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    total  = max(nums[:2]) if len(nums) >= 2 else 15
    remove = min(nums[:2]) if len(nums) >= 2 else 6
    remaining = total - remove
    itype = _item(question)
    return [
        NarrationBeat(
            text=f"We have {total} objects. We will take away {remove}.",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=1,
            extra={"label": str(total)},
        ),
        NarrationBeat(
            text=f"Let us subtract {total} minus {remove}.",
            action="SHOW_MEDIUM_SUBTRACTION",
            extra={"operand1": total, "operand2": remove},
        ),
        NarrationBeat(
            text=f"{total} minus {remove} equals {remaining}!",
            action="SHOW_EQUATION",
            equation=f"{total} - {remove} = {remaining}",
        ),
    ]


def _subtraction_comparison(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    a = nums[0] if len(nums) >= 2 else 9
    b = nums[1] if len(nums) >= 2 else 5
    diff = abs(a - b)
    itype = _item(question)
    return [
        NarrationBeat(
            text=f"Here are {a} objects on one side.",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=a,
        ),
        NarrationBeat(
            text=f"And {b} objects on the other side.",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=b,
        ),
        NarrationBeat(
            text=f"Let us match them one by one. {max(a,b)} has {diff} extra!",
            action="SHOW_PART_WHOLE_SUBTRACTION",
            extra={"operand1": a, "operand2": b},
        ),
        NarrationBeat(
            text=f"The difference is {diff}. {answer}",
            action="SHOW_EQUATION",
            equation=f"Difference is {diff}.",
        ),
    ]


def _subtraction_part_whole(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    whole = nums[0] if len(nums) >= 2 else 9
    part  = nums[1] if len(nums) >= 2 else 5
    other = whole - part
    itype = _item(question)
    return [
        NarrationBeat(
            text=f"The whole group has {whole}.",
            action="SHOW_PART_WHOLE_SUBTRACTION",
            item_type=itype,
            extra={"operand1": whole, "operand2": part},
        ),
        NarrationBeat(
            text=f"We know {part} of them. How many are the rest?",
            action="SHOW_PART_WHOLE_SUBTRACTION",
            item_type=itype,
            extra={"operand1": whole, "operand2": part},
        ),
        NarrationBeat(
            text=f"{whole} minus {part} equals {other}. The answer is {other}!",
            action="SHOW_EQUATION",
            equation=f"{whole} - {part} = {other}",
        ),
    ]


def _subtraction_story(question: str, answer: str) -> list[NarrationBeat]:
    return _subtraction_small(question, answer)


# ---------------------------------------------------------------------------
# Topic 6: Geometry
# ---------------------------------------------------------------------------

def _geometry_shape_properties(question: str, answer: str) -> list[NarrationBeat]:
    q = question.lower()
    shape = "circle"
    for s in ["triangle", "rectangle", "square", "circle", "oval", "pentagon", "hexagon"]:
        if s in q:
            shape = s
            break
    return [
        NarrationBeat(
            text=f"Let us look at a {shape}.",
            action="DRAW_SHAPE",
            extra={"shape": shape.upper()},
        ),
        NarrationBeat(
            text=answer,
            action="SHOW_EQUATION",
            equation=answer,
        ),
    ]


def _geometry_real_object(question: str, answer: str) -> list[NarrationBeat]:
    return [
        NarrationBeat(
            text="Let us look at objects around us and find their shapes.",
            action="DRAW_SHAPE",
            extra={"shape": "MIXED"},
        ),
        NarrationBeat(
            text=answer,
            action="SHOW_EQUATION",
            equation=answer,
        ),
    ]


# ---------------------------------------------------------------------------
# Topic 7: Patterns
# ---------------------------------------------------------------------------

def _patterns_object(question: str, answer: str) -> list[NarrationBeat]:
    itype = _item(question)
    return [
        NarrationBeat(
            text="Look at this pattern. What comes next?",
            action="ADD_ITEMS",
            item_type=itype,
            items_count=4,
        ),
        NarrationBeat(
            text=f"The pattern repeats. The next one is: {answer}!",
            action="SHOW_EQUATION",
            equation=answer,
        ),
    ]


def _patterns_number(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    nums_str = ", ".join(str(n) for n in nums)
    return [
        NarrationBeat(
            text=f"Look at these numbers: {nums_str}. Can you see the pattern?",
            action="SHOW_EQUATION",
            equation=f"Pattern: {nums_str}, ...",
        ),
        NarrationBeat(
            text=f"The pattern continues. The answer is {answer}!",
            action="SHOW_EQUATION",
            equation=f"Answer: {answer}",
        ),
    ]


# ---------------------------------------------------------------------------
# Topic 8: Currency
# ---------------------------------------------------------------------------

def _currency_count_total(question: str, answer: str) -> list[NarrationBeat]:
    nums = _nums(question)
    return [
        NarrationBeat(
            text="Let us count the money.",
            action="ADD_ITEMS",
            item_type="COIN",
            items_count=len(nums) if nums else 3,
        ),
        NarrationBeat(
            text=f"The total is {answer} taka!",
            action="SHOW_EQUATION",
            equation=f"Total = {answer} taka",
        ),
    ]


def _currency_which_notes(question: str, answer: str) -> list[NarrationBeat]:
    return [
        NarrationBeat(
            text="Let us find which notes and coins we need.",
            action="ADD_ITEMS",
            item_type="NOTE",
            items_count=3,
        ),
        NarrationBeat(
            text=f"{answer}",
            action="SHOW_EQUATION",
            equation=answer,
        ),
    ]


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

_DISPATCH: dict[tuple[str, str], callable] = {
    # Comparison
    ("comparison", "quantity"):        _comparison_quantity,
    ("comparison", "attribute"):       _comparison_attribute,
    ("comparison", "greater_smaller"): _comparison_greater_smaller,
    # Counting
    ("counting",   "small"):           _counting_small,
    ("counting",   "large"):           _counting_large,
    # Numbers
    ("numbers",    "words"):           _numbers_words,
    ("numbers",    "range"):           _numbers_range,
    ("numbers",    "next_previous"):   _numbers_next_previous,
    ("numbers",    "order"):           _numbers_order,
    ("numbers",    "rearrange"):       _numbers_rearrange,
    # Addition
    ("addition",   "small_word"):      _addition_small_word,
    ("addition",   "small_abstract"):  _addition_small_abstract,
    ("addition",   "medium"):          _addition_medium,
    ("addition",   "large"):           _addition_large,
    ("addition",   "story"):           _addition_story,
    # Subtraction
    ("subtraction","small"):           _subtraction_small,
    ("subtraction","medium"):          _subtraction_medium,
    ("subtraction","comparison"):      _subtraction_comparison,
    ("subtraction","part_whole"):      _subtraction_part_whole,
    ("subtraction","story"):           _subtraction_story,
    # Geometry
    ("geometry",   "shape_properties"):_geometry_shape_properties,
    ("geometry",   "real_object"):     _geometry_real_object,
    # Patterns
    ("patterns",   "object_pattern"):  _patterns_object,
    ("patterns",   "number_pattern"):  _patterns_number,
    # Currency
    ("currency",   "count_total"):     _currency_count_total,
    ("currency",   "which_notes"):     _currency_which_notes,
}
