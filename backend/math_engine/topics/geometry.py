"""
backend/math_engine/topics/geometry.py
Deterministic solver for geometry: shape facts, perimeter, area.
"""
import re
from typing import Optional

# "perimeter of a rectangle 5cm by 3cm"
PERIMETER_RECT_RE = re.compile(r"perimeter.*?(\d+(?:\.\d+)?)\s*(?:cm|m|mm|km)?\s*by\s*(\d+(?:\.\d+)?)", re.IGNORECASE)
# "perimeter of rectangle with length 8 and width 5"
PERIMETER_RECT_LW_RE = re.compile(
    r"perimeter.*?(?:length|l)\s*(?:of\s*)?(\d+(?:\.\d+)?).*?(?:width|breadth|w)\s*(?:of\s*)?(\d+(?:\.\d+)?)"
    r"|perimeter.*?(?:width|breadth|w)\s*(?:of\s*)?(\d+(?:\.\d+)?).*?(?:length|l)\s*(?:of\s*)?(\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
# "perimeter of a square with side 4cm"
PERIMETER_SQUARE_RE = re.compile(r"perimeter.*?square.*?side\s*(?:of\s*)?(\d+(?:\.\d+)?)", re.IGNORECASE)
# "area of a rectangle 5cm by 3cm"
AREA_RECT_RE = re.compile(r"area.*?(\d+(?:\.\d+)?)\s*(?:cm|m|mm|km)?\s*by\s*(\d+(?:\.\d+)?)", re.IGNORECASE)
# "area of rectangle with length 8 cm and width 5 cm"
AREA_RECT_LW_RE = re.compile(
    r"area.*?(?:length|l)\s*(?:of\s*)?(\d+(?:\.\d+)?).*?(?:width|breadth|w)\s*(?:of\s*)?(\d+(?:\.\d+)?)"
    r"|area.*?(?:width|breadth|w)\s*(?:of\s*)?(\d+(?:\.\d+)?).*?(?:length|l)\s*(?:of\s*)?(\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
# "area of a square with side 4"
AREA_SQUARE_RE = re.compile(r"area.*?square.*?side\s*(?:of\s*)?(\d+(?:\.\d+)?)", re.IGNORECASE)
# "area of triangle base 6 height 4"
AREA_TRIANGLE_RE = re.compile(r"area.*?triangle.*?base\s*(\d+(?:\.\d+)?).*?height\s*(\d+(?:\.\d+)?)|area.*?(\d+(?:\.\d+)?).*?base.*?(\d+(?:\.\d+)?).*?height", re.IGNORECASE)

SHAPE_FACTS = {
    "square": "A square has 4 equal sides and 4 right angles.",
    "rectangle": "A rectangle has 4 sides and 4 right angles. Opposite sides are equal.",
    "triangle": "A triangle has 3 sides and 3 angles. The angles add up to 180°.",
    "circle": "A circle has no corners. Every point on its edge is the same distance from the centre.",
    "pentagon": "A pentagon has 5 sides and 5 angles.",
    "hexagon": "A hexagon has 6 sides and 6 angles.",
}


def _fmt(n) -> str:
    return str(int(n)) if n == int(n) else str(n)


def solve_geometry(question: str) -> Optional[dict]:
    q = question.strip()
    ql = q.lower()

    # Perimeter of rectangle (by form)
    m = PERIMETER_RECT_RE.search(q)
    if m:
        l, w = float(m.group(1)), float(m.group(2))
        p = 2 * (l + w)
        return {
            "topic": "geometry",
            "answer": f"{_fmt(p)} cm",
            "steps": [
                {"title": "Perimeter formula", "text": "Perimeter of rectangle = 2 × (length + width)."},
                {"title": "Substitute", "text": f"2 × ({_fmt(l)} + {_fmt(w)}) = 2 × {_fmt(l+w)}."},
                {"title": "Answer", "text": f"Perimeter = {_fmt(p)} cm."},
            ],
            "smaller_example": "Smaller example: rectangle 3cm by 2cm → P = 2×(3+2) = 10cm",
        }

    # Perimeter of rectangle (length/width form)
    m = PERIMETER_RECT_LW_RE.search(q)
    if m:
        g = m.groups()
        l = float(g[0] or g[3])
        w = float(g[1] or g[2])
        p = 2 * (l + w)
        return {
            "topic": "geometry",
            "answer": f"{_fmt(p)} cm",
            "steps": [
                {"title": "Perimeter formula", "text": "Perimeter of rectangle = 2 × (length + width)."},
                {"title": "Substitute", "text": f"2 × ({_fmt(l)} + {_fmt(w)}) = 2 × {_fmt(l+w)}."},
                {"title": "Answer", "text": f"Perimeter = {_fmt(p)} cm."},
            ],
            "smaller_example": "Smaller example: rectangle 3cm by 2cm → P = 2×(3+2) = 10cm",
        }

    # Perimeter of square
    m = PERIMETER_SQUARE_RE.search(q)
    if m:
        s = float(m.group(1))
        p = 4 * s
        return {
            "topic": "geometry",
            "answer": f"{_fmt(p)} cm",
            "steps": [
                {"title": "Square perimeter", "text": "A square has 4 equal sides. Perimeter = 4 × side."},
                {"title": "Substitute", "text": f"4 × {_fmt(s)} = {_fmt(p)}."},
                {"title": "Answer", "text": f"Perimeter = {_fmt(p)} cm."},
            ],
            "smaller_example": "Smaller example: square side 3cm → P = 4×3 = 12cm",
        }

    # Area of rectangle (by form)
    m = AREA_RECT_RE.search(q)
    if m:
        l, w = float(m.group(1)), float(m.group(2))
        a = l * w
        return {
            "topic": "geometry",
            "answer": f"{_fmt(a)} cm²",
            "steps": [
                {"title": "Area formula", "text": "Area of rectangle = length × width."},
                {"title": "Substitute", "text": f"{_fmt(l)} × {_fmt(w)} = {_fmt(a)}."},
                {"title": "Answer", "text": f"Area = {_fmt(a)} cm²."},
            ],
            "smaller_example": "Smaller example: 3cm × 2cm = 6cm²",
        }

    # Area of rectangle (length/width form)
    m = AREA_RECT_LW_RE.search(q)
    if m:
        g = m.groups()
        l = float(g[0] or g[3])
        w = float(g[1] or g[2])
        a = l * w
        return {
            "topic": "geometry",
            "answer": f"{_fmt(a)} cm²",
            "steps": [
                {"title": "Area formula", "text": "Area of rectangle = length × width."},
                {"title": "Substitute", "text": f"{_fmt(l)} × {_fmt(w)} = {_fmt(a)}."},
                {"title": "Answer", "text": f"Area = {_fmt(a)} cm²."},
            ],
            "smaller_example": "Smaller example: 3cm × 2cm = 6cm²",
        }

    # Area of square
    m = AREA_SQUARE_RE.search(q)
    if m:
        s = float(m.group(1))
        a = s * s
        return {
            "topic": "geometry",
            "answer": f"{_fmt(a)} cm²",
            "steps": [
                {"title": "Square area", "text": "Area of square = side × side."},
                {"title": "Substitute", "text": f"{_fmt(s)} × {_fmt(s)} = {_fmt(a)}."},
                {"title": "Answer", "text": f"Area = {_fmt(a)} cm²."},
            ],
            "smaller_example": "Smaller example: square side 4cm → Area = 16cm²",
        }

    # Area of triangle
    m = AREA_TRIANGLE_RE.search(q)
    if m:
        b = float(m.group(1) or m.group(3))
        h = float(m.group(2) or m.group(4))
        a = 0.5 * b * h
        return {
            "topic": "geometry",
            "answer": f"{_fmt(a)} cm²",
            "steps": [
                {"title": "Triangle area formula", "text": "Area of triangle = ½ × base × height."},
                {"title": "Substitute", "text": f"½ × {_fmt(b)} × {_fmt(h)} = {_fmt(a)}."},
                {"title": "Answer", "text": f"Area = {_fmt(a)} cm²."},
            ],
            "smaller_example": "Smaller example: base 4cm, height 3cm → ½×4×3 = 6cm²",
        }

    # Shape facts
    for shape, fact in SHAPE_FACTS.items():
        if shape in ql:
            sides = {"square": 4, "rectangle": 4, "triangle": 3, "pentagon": 5, "hexagon": 6, "circle": 0}
            n_sides = sides.get(shape, "?")
            return {
                "topic": "geometry",
                "answer": fact,
                "steps": [
                    {"title": f"What is a {shape}?", "text": fact},
                    {"title": "Sides", "text": f"A {shape} has {n_sides} side(s)." if n_sides != 0 else "A circle has no sides — it is a curved shape."},
                    {"title": "Look around you", "text": f"Can you find a {shape} shape near you?"},
                ],
                "smaller_example": f"Example: a book is shaped like a rectangle.",
            }

    return None
