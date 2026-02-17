from __future__ import annotations

import re
from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFont

BG = "#0F172A"
PANEL = "#111827"
TEXT = "#F8FAFC"
BLUE = "#38BDF8"
ORANGE = "#FB923C"
GREEN = "#4ADE80"


def _parse_add_sub(problem: str) -> Tuple[int, str, int]:
    m = re.search(r"(\d+)\s*([+\-])\s*(\d+)", problem or "")
    if m:
        return int(m.group(1)), m.group(2), int(m.group(3))

    nums = [int(x) for x in re.findall(r"\d+", problem or "")]
    if len(nums) >= 2:
        return nums[0], "+", nums[1]
    if len(nums) == 1:
        return nums[0], "+", 1
    return 5, "+", 3


def _counter_positions(width: int, height: int, count: int, radius: int) -> List[Tuple[int, int, int, int]]:
    if count <= 0:
        return []

    cols = min(10, max(4, int(count ** 0.5) + 1))
    gap = radius // 2 + 10
    cell = radius * 2 + gap
    start_x = int(width * 0.08)
    start_y = int(height * 0.2)

    out: List[Tuple[int, int, int, int]] = []
    for i in range(count):
        row = i // cols
        col = i % cols
        x = start_x + col * cell
        y = start_y + row * cell
        out.append((x, y, x + radius * 2, y + radius * 2))
    return out


def _base_canvas(size: Tuple[int, int], title: str, subtitle: str) -> Tuple[Image.Image, ImageDraw.ImageDraw]:
    width, height = size
    image = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()

    draw.rounded_rectangle((20, 18, width - 20, 90), radius=14, fill=PANEL, outline="#334155", width=2)
    draw.text((40, 40), title, fill=TEXT, font=font)
    draw.text((40, 64), subtitle, fill="#CBD5E1", font=font)
    return image, draw


def _draw_counters(draw: ImageDraw.ImageDraw, boxes: List[Tuple[int, int, int, int]], color: str) -> None:
    for box in boxes:
        draw.ellipse(box, fill=color, outline="#0B1120", width=2)


def render_frames(prompt_json: dict, scene: dict, scene_index: int, canvas_size: Tuple[int, int]) -> List[Image.Image]:
    a, op, b = _parse_add_sub(str(prompt_json.get("problem", "")))
    if op == "+":
        ans = a + b
    else:
        ans = max(0, a - b)
        b = min(b, a)

    width, height = canvas_size
    radius = 22
    full_boxes = _counter_positions(width, height, a + b if op == "+" else a, radius)

    # Frame 1: first number counters.
    f1, d1 = _base_canvas(canvas_size, "Step 1", f"Show first number: {a}")
    _draw_counters(d1, full_boxes[:a], BLUE)

    # Frame 2: add/remove counters.
    if op == "+":
        f2, d2 = _base_canvas(canvas_size, "Step 2", f"Add {b} counters")
        _draw_counters(d2, full_boxes[:a], BLUE)
        _draw_counters(d2, full_boxes[a:a + b], ORANGE)
    else:
        f2, d2 = _base_canvas(canvas_size, "Step 2", f"Remove {b} counters")
        keep = full_boxes[:a - b]
        removed = full_boxes[a - b:a]
        _draw_counters(d2, keep, BLUE)
        for box in removed:
            d2.ellipse(box, fill="#1F2937", outline="#334155", width=2)

    # Frame 3: result.
    f3, d3 = _base_canvas(canvas_size, "Step 3", f"Result: {ans}")
    _draw_counters(d3, full_boxes[:ans], GREEN)
    d3.rounded_rectangle((width - 260, 110, width - 40, 180), radius=12, fill=PANEL, outline="#475569", width=2)
    d3.text((width - 230, 132), f"{a} {op} {b} = {ans}", fill=TEXT, font=ImageFont.load_default())

    return [f1, f2, f3]

