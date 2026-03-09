from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from collections import Counter
import math
import re

from PIL import Image, ImageOps

MAX_PDF_PAGES = 4
MAX_IMAGE_SIDE = 2200
_NUM_RE = r"\d[\d,]*(?:\.\d+)?"


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("\u00a0", " ")).strip()


def _split_candidate_lines(text: str) -> List[str]:
    lines = []
    for raw in re.split(r"\r?\n", text or ""):
        line = _clean_text(raw)
        if line:
            lines.append(line)
    return lines


def _score_question_line(line: str) -> int:
    low = line.lower()
    score = 0

    if len(line) < 6 or len(line) > 260:
        return -100

    if re.match(r"^\s*[a-dA-D][\).:-]\s*", line):
        score -= 4
    if len(re.findall(r"\b[a-dA-D]\)", line)) >= 2:
        score -= 2

    if "?" in line:
        score += 4
    if re.search(r"\d", line):
        score += 3
    if re.search(r"[+\-xX*÷/=]", line):
        score += 3
    if re.search(r"\b(find|what|calculate|solve|how many|determine|area|perimeter|volume|angle|fraction|ratio)\b", low):
        score += 3
    if re.search(r"\b(cm|mm|m|km|degrees|inch|ft|kg|g|ml|l)\b", low):
        score += 1
    if re.search(r"\b(triangle|circle|rectangle|square|polygon|diameter|radius|arc|chord|parallel|perpendicular)\b", low):
        score += 2

    return score


def _build_paragraph_segments(text: str) -> List[str]:
    """Join consecutive non-blank lines into paragraph chunks (separated by blank lines)."""
    segments: List[str] = []
    current: List[str] = []
    for raw in re.split(r"\r?\n", text or ""):
        line = _clean_text(raw)
        if line:
            current.append(line)
        else:
            if current:
                segments.append(" ".join(current))
                current = []
    if current:
        segments.append(" ".join(current))
    return [s for s in segments if s]


# Short words used to split OCR-merged lowercase runs (e.g. 'eweresittingon' -> 'e were sitting on')
# MUST be sorted by length (longest first) to prevent substring matches (e.g. 'standing' match before 'and')
_SPLIT_WORDS_LIST = (
    "were", "sitting", "standing", "people", "tables", "chairs", "each", "many",
    "there", "have", "that", "with", "from", "they", "this", "into", "than",
    "them", "some", "what", "also", "when", "which", "will", "your", "more",
    "then", "been", "does", "make", "like", "time", "just", "know", "take",
    "long", "even", "place", "give", "most", "very", "after", "thing", "only",
    "come", "think", "find", "here", "much", "before", "right", "look", "going",
    "well", "because", "same", "tell", "boys", "girls", "ball", "book", "left",
    "total", "price", "cost", "money", "taka", "rupee", "pound", "dollar",
    "table", "hall", "big", "room", "school", "class", "group", "shop",
    "how", "who", "why", "the", "and", "are", "was", "its", "his", "her",
    "has", "had", "but", "for", "you", "all", "can", "not", "one", "two",
    "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "on", "in", "it", "is", "if", "or", "of", "to", "at", "by", "up",
)
# Case-insensitive regex that matches any of the words, biased towards longer matches first
_SPLIT_WORDS_RE = re.compile(
    r"(" + "|".join(sorted(_SPLIT_WORDS_LIST, key=len, reverse=True)) + r")",
    re.IGNORECASE,
)


def _split_merged_word(token: str) -> str:
    """If a token looks like merged words (>10 chars, no spaces), try to split it safely."""
    if len(token) <= 10 or " " in token or not token.islower():
        return token
    # Use the regex to inject spaces around recognized words
    # e.g. "eweresittingon" -> "e were sitting on"
    # "werestanding" -> "were standing" (standing matches first so 'and' inside doesn't fire)
    split = _SPLIT_WORDS_RE.sub(r" \1 ", token)
    # Clean up double spaces
    return re.sub(r"\s+", " ", split).strip()


def _strip_serial_prefix(line: str) -> str:
    """Remove leading serial numbers like '1)', '2.', 'Q1:', or OCR-mangled lone digits."""
    # Standard prefix: 1) / 2. / Q3: / Q
    cleaned = re.sub(r"^\s*(?:[Qq]?\d{1,3}\s*[\).\-:\]]\s*|[Qq]\s*)", "", line).strip()
    # OCR artifact: lone 1-2 digit token before the real content (e.g. "3 300 people")
    # Safe to strip ONLY when it's followed by a larger number (the actual question number)
    cleaned = re.sub(r"^(\d{1,2})\s+(?=\d{2,})", "", cleaned).strip()
    return cleaned


def _pick_question(text: str) -> str:
    raw_lines = _split_candidate_lines(text)
    if not raw_lines:
        return ""

    # Build candidates: individual lines + paragraph segments
    # Paragraph segments get priority because they contain full context
    para_segments = _build_paragraph_segments(text)
    all_candidates: List[str] = []

    # If the total text is moderately short, it's highly likely a single cropped question.
    # Joining all lines bypasses OCR artifacts (like phantom blank lines) splitting sentences.
    full_flat = " ".join(raw_lines)
    if full_flat and len(full_flat) <= 400:
        all_candidates.append(full_flat)

    for seg in para_segments:
        if seg not in all_candidates:
            all_candidates.append(seg)
    for line in raw_lines:
        if line not in all_candidates:       # individual lines (deduped)
            all_candidates.append(line)

    # Score every candidate; paragraph segments that have both context AND a '?'
    # will naturally outscore individual fragments
    scored = sorted(
        ((c, _score_question_line(c)) for c in all_candidates),
        key=lambda x: x[1],
        reverse=True,
    )
    best_line, best_score = scored[0]

    if best_score >= 4:
        # Strip serial prefix (e.g. "1) 300 people...") before returning
        cleaned = _strip_serial_prefix(best_line)
        return cleaned if cleaned else best_line

    # Fallback: first sentence-sized chunk of flat text
    flat = _clean_text(text)
    if not flat:
        return ""
    # Expand fallback truncation from 220 to 800 chars (plenty for any primary math question)
    clipped = flat[:800]
    if len(flat) > 800 and " " in clipped:
        clipped = clipped.rsplit(" ", 1)[0]
    return _strip_serial_prefix(clipped)



def _cleanup_question_text(text: str) -> str:
    s = _clean_text(text)
    s = re.sub(r"([A-Za-z])(\d)", r"\1 \2", s)
    s = re.sub(r"(\d)([A-Za-z])", r"\1 \2", s)

    # Restore ordinal suffixes that got split: "5 th" -> "5th", "3 rd" -> "3rd"
    s = re.sub(r"(\d)\s+(st|nd|rd|th)\b", r"\1\2", s, flags=re.IGNORECASE)

    s = re.sub(
        r"\b(The)(product|sum|difference|quotient|perimeter|area|mean|average|multiple|factor)\b",
        r"\1 \2",
        s,
        flags=re.I,
    )
    s = re.sub(r"\s*,\s*", ",", s)
    s = re.sub(r",(?=\D)", ", ", s)

    # Protect known words that contain operator characters before spacing them:
    # 'x' appears in: expanded, maximum, next, exact, example, hex, etc.
    # Save these by replacing with a placeholder, apply operator spacing, then restore.
    WORD_X_RE = re.compile(
        r"\b(e x panded|ma x imum|ne x t|e x act|e x ample|he x|conte x t|comple x)\b",
        re.IGNORECASE,
    )
    # Pre-clean: normalize operator spacing only for standalone operators (not inside words)
    s = re.sub(r"(?<=[\d\s])=(?=[\d\s?_])", " = ", s)  # = between numbers
    s = re.sub(r"(?<=[\d])([+\-])(?=[\d])", r" \1 ", s)  # +/- between digits
    s = re.sub(r"(?<=[\d])([*])(?=[\d])", r" \1 ", s)   # * between digits
    # 'x' only as multiplication: digit x digit or standalone ' x '
    s = re.sub(r"(?<=[\d])\s*[xX]\s*(?=[\d])", " x ", s)  # 4x9 -> 4 x 9
    s = re.sub(r"(?<=[\d])\s*/\s*(?=[\d])", " / ", s)   # 48/6 -> 48 / 6

    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"\s+([?.!])", r"\1", s)
    s = re.sub(r"[_]{2,}", "__", s)
    return s



def _normalize_spacing_math(text: str) -> str:
    t = _clean_text(text)
    t = (
        t.replace("×", "x")
        .replace("÷", "/")
        .replace("−", "-")
        .replace("–", "-")
        .replace("—", "-")
    )
    # Capital X as multiplication only between digits (4X9 -> 4 x 9)
    t = re.sub(r"(?<=\d)\s*X\s*(?=\d)", " x ", t)
    # Lowercase x as multiplication only between digits (not inside words like expanded)
    t = re.sub(r"(?<=\d)\s*x\s*(?=\d)", " x ", t)
    # Slash as division only between digits
    t = re.sub(r"(?<=\d)\s*/\s*(?=\d)", " / ", t)
    t = re.sub(r"\s*=\s*", " = ", t)
    t = re.sub(r"\s*\+\s*", " + ", t)
    t = re.sub(r"(?<!-)\s*-\s*(?!-)", " - ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _insert_blank_in_side(side: str) -> Tuple[str, bool]:
    s = _normalize_spacing_math(side)
    if "__" in s:
        return s, False

    if re.search(r"([+\-x/])\s*([+\-x/])", s):
        fixed = re.sub(r"([+\-x/])\s*([+\-x/])", r"\1 __ \2", s, count=1)
        return _normalize_spacing_math(fixed), True

    m = re.match(r"^([+\-x/])\s*(.+)$", s)
    if m:
        op, right = m.group(1), m.group(2)
        return _normalize_spacing_math(f"__ {op} {right}"), True

    m = re.match(r"^(.+?)\s*([+\-x/])$", s)
    if m:
        left, op = m.group(1), m.group(2)
        return _normalize_spacing_math(f"{left} {op} __"), True

    return s, False


def _commutative_operator(side: str) -> str:
    s = f" {side} "
    if " + " in s and " - " not in s and " / " not in s:
        return "+"
    if " x " in s and " - " not in s and " / " not in s:
        return "x"
    return ""


def _repair_equation_question(question: str, extracted_text: str) -> str:
    q = _normalize_spacing_math(question)
    text = _normalize_spacing_math(extracted_text)

    q = re.sub(r"[_]{2,}", "__", q)
    q = re.sub(r"[□▢⬜]+", "__", q)
    # Remove common serial prefixes (e.g., "7. ___ + 44 = 64")
    q_core = re.sub(r"^\s*\d{1,3}\s*[\).:\-]\s*", "", q).strip()
    q_core = re.sub(r"^[\s,.;:]+", "", q_core).strip()

    has_blank_marker = bool(re.search(r"[_-]{3,}|[□▢⬜]", (extracted_text or "") + " " + (question or "")))
    has_gap_hint = bool(re.search(r"([+\-x/])\s*([+\-x/])", q_core)) or bool(re.search(r"[+\-x/]\s*$", q_core))

    # Multiplication/division blanks without reliable "=".
    m = re.match(fr"^[x*]\s*({_NUM_RE})\s*=?\s*({_NUM_RE})$", q_core)
    if m:
        a, b = m.group(1), m.group(2)
        return f"Find the missing number: __ x {a} = {b}"

    m = re.match(fr"^[/]\s*({_NUM_RE})\s*=?\s*({_NUM_RE})$", q_core)
    if m:
        a, b = m.group(1), m.group(2)
        return f"Find the missing number: __ / {a} = {b}"

    if "=" not in q_core:
        # Handles OCR like: "+ 44 64", "__ + 44 64", "x 100 6800"
        m = re.match(fr"^(__\s*)?([+\-x/])\s*({_NUM_RE})\s*({_NUM_RE})$", q_core)
        if m and (has_blank_marker or "find" in q_core.lower() or "missing" in q_core.lower() or q_core != q):
            op, a, b = m.group(2), m.group(3), m.group(4)
            return f"Find the missing number: __ {op} {a} = {b}"

        # Handles OCR like: ". + 44 64" after weak serial cleanup.
        m = re.match(fr"^[.:\-]?\s*([+\-x/])\s*({_NUM_RE})\s*({_NUM_RE})$", q_core)
        if m and (has_blank_marker or q_core != q):
            op, a, b = m.group(1), m.group(2), m.group(3)
            return f"Find the missing number: __ {op} {a} = {b}"

        m = re.search(fr"\b([x/])\s*({_NUM_RE})\s*({_NUM_RE})\b", q_core)
        if m and (has_blank_marker or q_core.startswith("x ") or q_core.startswith("/ ") or "find" in q_core.lower() or "missing" in q_core.lower()):
            op, a, b = m.group(1), m.group(2), m.group(3)
            return f"Find the missing number: __ {op} {a} = {b}"

    if "=" in q_core:
        lhs_raw, rhs_raw = [part.strip() for part in q_core.split("=", 1)]

        # Handles OCR like: "+ 44 = 64"
        m = re.match(fr"^([+\-x/])\s*({_NUM_RE})$", lhs_raw)
        if m:
            op, a = m.group(1), m.group(2)
            return f"Find the missing number: __ {op} {a} = {rhs_raw}"

        if not lhs_raw and rhs_raw:
            return f"Find the missing number: __ = {rhs_raw}"
        if lhs_raw and not rhs_raw:
            return f"Find the missing number: {lhs_raw} = __"

        # Side-level insertion for leading/trailing/double operators.
        lhs_fixed, lhs_changed = _insert_blank_in_side(lhs_raw)
        rhs_fixed, rhs_changed = _insert_blank_in_side(rhs_raw)
        if lhs_changed or rhs_changed:
            return f"Find the missing number: {lhs_fixed} = {rhs_fixed}"

        # Commutative (+, x) side has one missing term.
        lhs_op = _commutative_operator(lhs_raw)
        rhs_op = _commutative_operator(rhs_raw)
        if lhs_op and rhs_op and lhs_op == rhs_op:
            lhs_terms = re.findall(_NUM_RE, lhs_raw)
            rhs_terms = re.findall(_NUM_RE, rhs_raw)
            if lhs_terms and rhs_terms and len(lhs_terms) == len(rhs_terms) + 1 and (has_blank_marker or has_gap_hint):
                lhs_count = Counter(x.replace(",", "") for x in lhs_terms)
                rhs_count = Counter(x.replace(",", "") for x in rhs_terms)
                missing = lhs_count - rhs_count
                if sum(missing.values()) == 1:
                    return f"Find the missing number: {lhs_raw} = {rhs_raw} {lhs_op} __"

    return q_core or q


def _repair_mcq_question(question: str, extracted_text: str) -> str:
    q = _cleanup_question_text(question)
    text = extracted_text or ""

    # --- Handle numbered MCQ choices (1. ... 2. ... 3. ...) ---
    # Pattern: stem followed by "1. option 2. option 3. option 4. option"
    numbered_option_re = re.compile(
        r"(?<![A-Za-z0-9])\s*1[\s.\)]\s*.+?(?:\s+2[\s.\)]\s*.+?)+",
        re.IGNORECASE | re.DOTALL,
    )
    num_match = numbered_option_re.search(q)
    if num_match:
        stem = q[:num_match.start()].strip(" :;-")
        if stem and len(stem) >= 8:  # a proper stem has some length
            if not re.search(r"[.?!]$", stem):
                stem = f"{stem}?"
            return _cleanup_question_text(stem)

    # Also check the full extracted raw text in case the cleaned question missed the options
    num_match_full = numbered_option_re.search(text)
    if num_match_full:
        stem = text[:num_match_full.start()].strip(" :;-")
        stem = _cleanup_question_text(stem)
        if stem and len(stem) >= 8:
            if not re.search(r"[.?!]$", stem):
                stem = f"{stem}?"
            return stem

    # --- Handle lettered MCQ choices (a) b) c) d)) ---
    option_pattern = re.compile(r"\b([a-dA-D])\s*[\)\.]")

    candidate = q
    if len(re.findall(option_pattern, text)) >= 2 and len(text) > len(candidate):
        candidate = _cleanup_question_text(text)

    candidate = re.sub(r"\b([a-dA-D])\s*[\)\.\.]", r" \1) ", candidate)
    option_match = re.search(r"\b[a-dA-D]\)\s*", candidate)
    if not option_match:
        return q

    stem = candidate[:option_match.start()].strip(" :;-")
    if not stem:
        return q

    if not re.search(r"[.?!]$", stem):
        stem = f"{stem}?"

    return _cleanup_question_text(stem)


def _resize_image(image: Image.Image) -> Image.Image:
    image = image.convert("RGB")
    w, h = image.size
    longest = max(w, h)
    if longest <= MAX_IMAGE_SIDE:
        return image

    scale = MAX_IMAGE_SIDE / float(longest)
    return image.resize((max(1, int(w * scale)), max(1, int(h * scale))))


MIN_OCR_SIDE = 800   # minimum side length for good OCR accuracy


def _prepare_for_ocr(image: Image.Image) -> Image.Image:
    """Resize, sharpen and binarise an image for best OCR accuracy."""
    from PIL import ImageFilter, ImageEnhance

    # 1. Convert to RGB then grayscale
    img = _resize_image(image).convert("L")

    # 2. Upscale small images — OCR accuracy degrades sharply on small text
    w, h = img.size
    shortest = min(w, h)
    if shortest < MIN_OCR_SIDE:
        scale = MIN_OCR_SIDE / shortest
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # 3. Sharpen to make character edges crisp
    img = img.filter(ImageFilter.SHARPEN)
    img = img.filter(ImageFilter.SHARPEN)   # twice for faint text

    # 4. Boost contrast before thresholding
    img = ImageOps.autocontrast(img, cutoff=2)

    # 5. Simple global binarisation via point threshold
    #    (Pillow doesn't have Otsu, but autocontrast + threshold is close)
    img = img.point(lambda p: 255 if p > 140 else 0)

    return img.convert("RGB")


_RAPID_OCR: Any = None


def _ocr_with_rapidocr(image: Image.Image) -> Tuple[str, Optional[str]]:
    global _RAPID_OCR

    try:
        import numpy as np
        from rapidocr_onnxruntime import RapidOCR
    except Exception:
        return "", None

    try:
        if _RAPID_OCR is None:
            _RAPID_OCR = RapidOCR()

        arr = np.array(image.convert("RGB"))
        result, _ = _RAPID_OCR(arr)
        if not result:
            return "", "rapidocr"

        lines: List[str] = []
        for item in result:
            if not isinstance(item, (list, tuple)) or len(item) < 2:
                continue
            text = item[1]
            if isinstance(text, str) and text.strip():
                lines.append(text.strip())

        return "\n".join(lines), "rapidocr"
    except Exception:
        return "", "rapidocr"


def _ocr_with_tesseract(image: Image.Image) -> Tuple[str, Optional[str]]:
    try:
        import pytesseract
    except Exception:
        return "", None

    try:
        text = pytesseract.image_to_string(
            image,
            config="--oem 3 --psm 4",  # PSM 4: single column of variable-size text
        )
        return text or "", "tesseract"
    except Exception:
        return "", "tesseract"


def _repair_ocr_text(raw: str) -> str:
    """
    Post-OCR text cleanup for common artifacts:
    - Missing space after sentence-ending punctuation (e.g. 'hall.How')
    - Missing space before capital after lowercase ('tableHow' -> 'table How')
    - Lowercase word merging via greedy dictionary split ('eweresittingon' -> 'e were sitting on')
    """
    if not raw:
        return raw

    lines = raw.split("\n")
    cleaned: List[str] = []
    for line in lines:
        s = line.strip()
        if not s:
            cleaned.append("")
            continue
        # Insert space after '.', '!', '?' when immediately followed by a letter
        s = re.sub(r"([.!?])([A-Za-z])", r"\1 \2", s)
        # Insert space before a capital letter that follows a lowercase letter
        s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
        # Try to split long all-lowercase merged tokens
        tokens = s.split(" ")
        tokens = [_split_merged_word(t) for t in tokens]
        s = " ".join(tokens)
        # Collapse accidental double-spaces
        s = re.sub(r" {2,}", " ", s).strip()
        cleaned.append(s)

    return "\n".join(cleaned)


def _ocr_image(image: Image.Image) -> Tuple[str, str]:
    prepared = _prepare_for_ocr(image)

    for fn in (_ocr_with_rapidocr, _ocr_with_tesseract):
        text, engine = fn(prepared)
        if _clean_text(text):
            return _repair_ocr_text(text), engine or "unknown"

    return "", "none"


def _extract_pdf_text(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
    except Exception:
        return ""

    try:
        reader = PdfReader(BytesIO(file_bytes))
        parts: List[str] = []
        page_count = min(len(reader.pages), MAX_PDF_PAGES)
        for i in range(page_count):
            text = reader.pages[i].extract_text() or ""
            if _clean_text(text):
                parts.append(text)
        return "\n".join(parts)
    except Exception:
        return ""


def _render_pdf_pages(file_bytes: bytes) -> List[Image.Image]:
    try:
        import fitz
    except Exception:
        return []

    pages: List[Image.Image] = []
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = min(doc.page_count, MAX_PDF_PAGES)
        for i in range(page_count):
            page = doc.load_page(i)
            pix = page.get_pixmap(alpha=False, matrix=fitz.Matrix(2, 2))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            pages.append(img)
        doc.close()
    except Exception:
        return []

    return pages


def _extract_point_labels(text: str) -> List[str]:
    labels = sorted(set(re.findall(r"\b[A-Z]{1,2}\b", text or "")))
    # Filter common units that look like labels.
    blocked = {"CM", "MM", "KM", "KG", "ML", "FT", "IN"}
    return [x for x in labels if x not in blocked][:12]


def _analyze_geometry(image: Image.Image, text: str) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        "analysis_available": False,
        "has_diagram": False,
        "line_segments": 0,
        "circles": 0,
        "parallel_pairs": 0,
        "perpendicular_pairs": 0,
        "point_labels": _extract_point_labels(text),
        "shape_hints": [],
    }

    low = (text or "").lower()

    try:
        import cv2
        import numpy as np
    except Exception:
        summary["shape_hints"] = _shape_hints_from_text(low, summary["point_labels"])  # type: ignore[index]
        return summary

    arr = np.array(_resize_image(image).convert("RGB"))
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 70, 170)

    h, w = gray.shape[:2]
    min_len = max(18, int(min(w, h) * 0.12))
    lines = cv2.HoughLinesP(edges, 1, math.pi / 180, threshold=80, minLineLength=min_len, maxLineGap=12)

    line_count = int(lines.shape[0]) if lines is not None else 0
    angles: List[float] = []

    if lines is not None:
        sample = lines[:35]
        for line in sample:
            x1, y1, x2, y2 = line[0]
            angle = abs(math.degrees(math.atan2(y2 - y1, x2 - x1)))
            if angle > 90:
                angle = 180 - angle
            angles.append(angle)

    parallel_pairs = 0
    perpendicular_pairs = 0
    for i in range(len(angles)):
        for j in range(i + 1, len(angles)):
            diff = abs(angles[i] - angles[j])
            if diff <= 8:
                parallel_pairs += 1
            if abs(diff - 90) <= 10:
                perpendicular_pairs += 1

    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=max(20, int(min(w, h) * 0.12)),
        param1=120,
        param2=28,
        minRadius=max(8, int(min(w, h) * 0.04)),
        maxRadius=max(20, int(min(w, h) * 0.45)),
    )
    circle_count = 0 if circles is None else int(circles.shape[1])

    geometry_words = any(k in low for k in ["triangle", "circle", "rectangle", "square", "angle", "radius", "diameter", "perimeter", "area", "shape", "figure"])
    is_word_heavy = len(low.split()) >= 15
    has_diagram = line_count >= 5 or parallel_pairs >= 1 or perpendicular_pairs >= 1 or (circle_count >= 1 and (geometry_words or not is_word_heavy))

    summary.update(
        {
            "analysis_available": True,
            "has_diagram": has_diagram,
            "line_segments": line_count,
            "circles": circle_count,
            "parallel_pairs": parallel_pairs,
            "perpendicular_pairs": perpendicular_pairs,
        }
    )

    shape_hints = _shape_hints_from_text(low, summary["point_labels"])  # type: ignore[index]
    if circle_count > 0 and (geometry_words or not is_word_heavy) and "circle" not in shape_hints:
        shape_hints.append("circle")
    if line_count >= 3 and "triangle" not in shape_hints and "triangle" in low:
        shape_hints.append("triangle")
    if line_count >= 4 and perpendicular_pairs > 0 and "rectangle" in low and "rectangle" not in shape_hints:
        shape_hints.append("rectangle")
    if perpendicular_pairs > 0 and "right-angle" not in shape_hints:
        if "right angle" in low or "90" in low:
            shape_hints.append("right-angle")

    summary["shape_hints"] = shape_hints
    return summary


def _shape_hints_from_text(low_text: str, labels: List[str]) -> List[str]:
    hints: List[str] = []

    key_map = {
        "triangle": "triangle",
        "circle": "circle",
        "rectangle": "rectangle",
        "square": "square",
        "parallelogram": "parallelogram",
        "trapez": "trapezium",
        "polygon": "polygon",
        "angle": "angles",
        "perimeter": "perimeter",
        "area": "area",
        "radius": "radius",
        "diameter": "diameter",
        "chord": "chord",
    }

    for key, value in key_map.items():
        if key in low_text and value not in hints:
            hints.append(value)

    if len(labels) >= 3 and "labeled-points" not in hints:
        hints.append("labeled-points")

    return hints


def _estimate_confidence(extracted_text: str, question: str, geometry: Dict[str, Any]) -> float:
    score = 0.2

    if len(_clean_text(extracted_text)) >= 25:
        score += 0.25
    if len(_clean_text(question)) >= 12:
        score += 0.2
    if re.search(r"\d", question or ""):
        score += 0.15
    if re.search(r"[+\-xX*÷/=]", question or ""):
        score += 0.1
    if re.search(r"\b(area|perimeter|angle|triangle|circle|rectangle|fraction|ratio)\b", question or "", flags=re.I):
        score += 0.1
    if geometry.get("has_diagram"):
        score += 0.1

    return max(0.05, min(0.99, round(score, 3)))


def llm_fix_ocr_question(raw_ocr: str) -> str:
    """Legacy wrapper: extract just the cleaned question string from LLM structured response."""
    result = llm_extract_structured(raw_ocr)
    if result and result.get("question"):
        return result["question"]
    return raw_ocr


def llm_extract_structured(raw_ocr: str) -> Optional[Dict[str, Any]]:
    """
    Use the LLM to extract and classify a math question from noisy OCR text.
    Returns a structured dict or None if the LLM is unavailable or fails.

    Returned dict shape:
    {
        "question": str,             # cleaned question stem (no MCQ options in it)
        "question_type": str,        # arithmetic|word_problem|mcq|fill_blank|true_false|sequence|comparison|geometry|other
        "options": [                 # only present for MCQ
            {"id": "1", "text": "...", "value": 3704}
        ],
        "pre_solved_answer": str,    # e.g. "Option 2: 200 more than 3604" or "9" or null
        "pre_solved_steps": [str],   # child-friendly explanation steps
    }
    """
    if not raw_ocr or not raw_ocr.strip():
        return None

    try:
        from backend.core.llm import get_client, get_model
        client = get_client()
        model = get_model()
    except Exception:
        return None

    prompt = f"""You are a primary school math expert assistant.
You will receive raw OCR text from a math worksheet. Your job is to:
1. Fix any OCR errors (typos, merged words, wrong characters, scrambled word order)
2. Extract the complete math problem cleanly (including all setup/context sentences and the final question)
3. Classify the question type
4. If it is MCQ, evaluate each option numerically and identify the correct answer
5. Pre-solve the question with child-friendly steps

Return ONLY a JSON object with this exact shape (no markdown, no explanation):
{{
  "question": "<The COMPLETE math problem including all context, setup sentences, and the final question. Do NOT include answer options if it's an MCQ.>",
  "question_type": "<one of: arithmetic, word_problem, mcq, fill_blank, true_false, sequence, comparison, geometry, other>",
  "options": [
    {{"id": "1", "text": "<option text>", "value": <computed number or null>}},
    ...
  ],
  "pre_solved_answer": "<correct answer as a clear string, e.g. 'Option 2: 200 more than 3604' or '9' or 'True'> or null if unsure",
  "pre_solved_steps": ["<step 1 in simple language a child can understand>", "<step 2>", ...]
}}

Rules:
- "options" should only be present for MCQ questions. For all other types, set "options" to [].
- For MCQ, evaluate each option numerically. For "X more than Y" compute X+Y. For "X less than Y" compute Y-X. For "N thousands M hundreds..." expand to the full number.
- If the question asks "which is NOT equal to X", find which option does NOT equal X.
- If the question asks "which is equal to X", find which option equals X.
- Preserve ALL numbers exactly as they appear in the OCR text.
- For fill-in-the-blank, show the missing number as the answer.
- Keep steps simple and encouraging for young children (Grade 1-5).

OCR TEXT:
{raw_ocr.strip()}"""

    try:
        import json
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=800,
            timeout=12.0,  # Fail fast! (12 seconds). Don't hang for 3 minutes if LLM is down.
        )
        raw_response = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        raw_response = re.sub(r"^```(?:json)?\s*", "", raw_response, flags=re.MULTILINE)
        raw_response = re.sub(r"\s*```$", "", raw_response, flags=re.MULTILINE)

        parsed = json.loads(raw_response)

        # Validate minimum required fields
        if not isinstance(parsed, dict) or not parsed.get("question"):
            return None

        # Sanity check: question must contain at least one digit
        if not re.search(r"\d", parsed["question"]):
            return None

        return parsed

    except Exception:
        return None



def _extract_from_image_bytes(file_bytes: bytes) -> Tuple[str, str, str, Dict[str, Any], List[str], Dict[str, Any]]:
    try:
        image = Image.open(BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError("Could not open image file.") from exc

    raw_text, ocr_engine = _ocr_image(image)
    extracted_text = _clean_text(raw_text)
    geometry = _analyze_geometry(image, raw_text)

    # Try the smart LLM extraction first
    llm_result = llm_extract_structured(raw_text)
    pre_solved: Dict[str, Any] = {}

    if llm_result and llm_result.get("question"):
        question = llm_result["question"]
        options = llm_result.get("options", [])
        steps = llm_result.get("pre_solved_steps", [])

        # For MCQ, prepend the full options list as a context step so the
        # video-generation LLM always has the complete picture.
        if options:
            option_lines = [f"{o.get('id', i + 1)}. {o.get('text', '')}" for i, o in enumerate(options)]
            options_context = "The choices are:\n" + "\n".join(option_lines)
            steps = [options_context] + steps

        pre_solved = {
            "question_type": llm_result.get("question_type", "other"),
            "options": options,
            "pre_solved_answer": llm_result.get("pre_solved_answer"),
            "pre_solved_steps": steps,
        }
    else:
        # Regex fallback
        question = _pick_question(raw_text)
        question = _repair_equation_question(question, raw_text)
        question = _repair_mcq_question(question, raw_text)
        question = _cleanup_question_text(question)

    notes: List[str] = []
    if ocr_engine == "none":
        notes.append("OCR engine unavailable on server. Install rapidocr-onnxruntime or pytesseract.")
    else:
        notes.append(f"OCR engine used: {ocr_engine}.")
    if llm_result:
        notes.append("LLM-assisted extraction used.")

    if not question:
        raise ValueError("Could not extract a math question from the uploaded image.")

    return question, extracted_text, ocr_engine, geometry, notes, pre_solved


def _extract_from_pdf_bytes(file_bytes: bytes) -> Tuple[str, str, str, Dict[str, Any], List[str], Dict[str, Any]]:
    notes: List[str] = []
    pre_solved: Dict[str, Any] = {}

    raw_text = _extract_pdf_text(file_bytes)
    extracted_text = _clean_text(raw_text)
    ocr_engine = "pdf-text"
    geometry: Dict[str, Any] = {
        "analysis_available": False,
        "has_diagram": False,
        "line_segments": 0,
        "circles": 0,
        "parallel_pairs": 0,
        "perpendicular_pairs": 0,
        "point_labels": _extract_point_labels(raw_text),
        "shape_hints": _shape_hints_from_text(raw_text.lower(), _extract_point_labels(raw_text)),
    }

    # Try LLM extraction first
    llm_result = llm_extract_structured(raw_text) if raw_text.strip() else None
    if llm_result and llm_result.get("question"):
        question = llm_result["question"]
        options = llm_result.get("options", [])
        steps = llm_result.get("pre_solved_steps", [])
        if options:
            option_lines = [f"{o.get('id', i + 1)}. {o.get('text', '')}" for i, o in enumerate(options)]
            steps = ["The choices are:\n" + "\n".join(option_lines)] + steps
        pre_solved = {
            "question_type": llm_result.get("question_type", "other"),
            "options": options,
            "pre_solved_answer": llm_result.get("pre_solved_answer"),
            "pre_solved_steps": steps,
        }
        notes.append("LLM-assisted extraction used.")
    else:
        question = _pick_question(raw_text)
        question = _repair_equation_question(question, raw_text)
        question = _repair_mcq_question(question, raw_text)
        question = _cleanup_question_text(question)

    # If native text is weak, render pages and OCR.
    if len(_clean_text(question)) < 8:
        pages = _render_pdf_pages(file_bytes)
        if not pages:
            raise ValueError("Could not read text from PDF. Try a clearer PDF or image.")

        ocr_chunks: List[str] = []
        used_engine = "none"
        for page in pages:
            page_text, engine = _ocr_image(page)
            if _clean_text(page_text):
                ocr_chunks.append(page_text)
            if engine != "none":
                used_engine = engine

        raw_text = "\n".join(ocr_chunks)
        extracted_text = _clean_text(raw_text)

        llm_result2 = llm_extract_structured(raw_text) if raw_text.strip() else None
        if llm_result2 and llm_result2.get("question"):
            question = llm_result2["question"]
            options2 = llm_result2.get("options", [])
            steps2 = llm_result2.get("pre_solved_steps", [])
            if options2:
                option_lines2 = [f"{o.get('id', i + 1)}. {o.get('text', '')}" for i, o in enumerate(options2)]
                steps2 = ["The choices are:\n" + "\n".join(option_lines2)] + steps2
            pre_solved = {
                "question_type": llm_result2.get("question_type", "other"),
                "options": options2,
                "pre_solved_answer": llm_result2.get("pre_solved_answer"),
                "pre_solved_steps": steps2,
            }
        else:
            question = _pick_question(raw_text)
            question = _repair_equation_question(question, raw_text)
            question = _repair_mcq_question(question, raw_text)
            question = _cleanup_question_text(question)

        ocr_engine = used_engine if used_engine != "none" else "none"

        if pages:
            geometry = _analyze_geometry(pages[0], raw_text)

        notes.append("Used OCR on rendered PDF pages.")

    if not question:
        raise ValueError("Could not extract a math question from the uploaded PDF.")

    return question, extracted_text, ocr_engine, geometry, notes, pre_solved


def extract_math_problem_from_upload(file_bytes: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    if not file_bytes:
        raise ValueError("Uploaded file is empty.")

    if len(file_bytes) > 12 * 1024 * 1024:
        raise ValueError("File too large. Please upload a file under 12 MB.")

    suffix = Path(filename or "").suffix.lower()
    ctype = (content_type or "").lower()

    is_pdf = suffix == ".pdf" or ctype == "application/pdf"
    is_image = ctype.startswith("image/") or suffix in {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".gif"}

    if not is_pdf and not is_image:
        raise ValueError("Unsupported file type. Upload an image or PDF.")

    if is_pdf:
        question, extracted_text, ocr_engine, geometry, notes, pre_solved = _extract_from_pdf_bytes(file_bytes)
        source_type = "pdf"
    else:
        question, extracted_text, ocr_engine, geometry, notes, pre_solved = _extract_from_image_bytes(file_bytes)
        source_type = "image"

    confidence = _estimate_confidence(extracted_text, question, geometry)

    return {
        "question": question,
        "extracted_text": extracted_text,
        "source_type": source_type,
        "ocr_engine": ocr_engine,
        "confidence": confidence,
        "geometry": geometry,
        "notes": notes,
        "pre_solved_answer": pre_solved.get("pre_solved_answer"),
        "pre_solved_steps": pre_solved.get("pre_solved_steps", []),
        "pre_solved_options": pre_solved.get("options", []),
        "question_type": pre_solved.get("question_type", "other"),
    }

