from __future__ import annotations

import re
from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFont

BG = "#102A43"
PANEL = "#1B365D"
TEXT = "#F8FAFC"
SLICE = "#E2E8F0"
SELECTED = "#F59E0B"
OUTLINE = "#0B1120"


def _parse_fraction(problem: str) -> Tuple[int, int]:
    m = re.search(r"(\d+)\s*/\s*(\d+)", problem or "")
    if m:
        n = int(m.group(1))
        d = int(m.group(2))
        if d > 0:
            return n, d
    return 1, 4


def _base_canvas(size: Tuple[int, int], title: str, subtitle: str) -> Tuple[Image.Image, ImageDraw.ImageDraw]:
    width, _ = size
    image = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.rounded_rectangle((20, 18, width - 20, 90), radius=14, fill=PANEL, outline="#334155", width=2)
    draw.text((40, 40), title, fill=TEXT, font=font)
    draw.text((40, 64), subtitle, fill="#CBD5E1", font=font)
    return image, draw


def _draw_pie(draw: ImageDraw.ImageDraw, box: Tuple[int, int, int, int], numerator: int, denominator: int, mode: str) -> None:
    if mode == "full":
        draw.ellipse(box, fill=SLICE, outline=OUTLINE, width=3)
        return

    step = 360 / denominator
    for i in range(denominator):
        start = -90 + i * step
        end = start + step
        fill = SLICE
        if mode == "highlight" and i < numerator:
            fill = SELECTED
        draw.pieslice(box, start=start, end=end, fill=fill, outline=OUTLINE, width=2)


def render_frames(prompt_json: dict, scene: dict, scene_index: int, canvas_size: Tuple[int, int]) -> List[Image.Image]:
    numerator, denominator = _parse_fraction(str(prompt_json.get("problem", "")))
    denominator = max(2, min(denominator, 12))
    numerator = max(1, min(numerator, denominator))

    width, height = canvas_size
    r = min(width, height) // 4
    cx, cy = width // 2, int(height * 0.52)
    pie_box = (cx - r, cy - r, cx + r, cy + r)

    # Frame 1: full circle.
    f1, d1 = _base_canvas(canvas_size, "Step 1", "Start with one whole")
    _draw_pie(d1, pie_box, numerator, denominator, mode="full")

    # Frame 2: split equally.
    f2, d2 = _base_canvas(canvas_size, "Step 2", f"Split into {denominator} equal parts")
    _draw_pie(d2, pie_box, numerator, denominator, mode="split")

    # Frame 3: highlight selected fraction.
    f3, d3 = _base_canvas(canvas_size, "Step 3", f"Select {numerator}/{denominator}")
    _draw_pie(d3, pie_box, numerator, denominator, mode="highlight")
    d3.rounded_rectangle((width - 290, 110, width - 40, 182), radius=12, fill=PANEL, outline="#475569", width=2)
    d3.text((width - 250, 132), f"{numerator}/{denominator}", fill=TEXT, font=ImageFont.load_default())

    return [f1, f2, f3]

