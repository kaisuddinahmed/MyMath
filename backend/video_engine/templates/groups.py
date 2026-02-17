from __future__ import annotations

import re
from typing import List, Tuple

from PIL import Image, ImageDraw, ImageFont

BG = "#0B132B"
PANEL = "#101E3D"
TEXT = "#F8FAFC"
BOX_FILL = "#DBEAFE"
BOX_OUTLINE = "#1E3A8A"
DOT = "#0EA5E9"
HIGHLIGHT = "#22C55E"


def _parse_mul_div(problem: str) -> Tuple[int, str, int]:
    m = re.search(r"(\d+)\s*([xX*÷/])\s*(\d+)", problem or "")
    if m:
        return int(m.group(1)), m.group(2), int(m.group(3))

    nums = [int(x) for x in re.findall(r"\d+", problem or "")]
    if len(nums) >= 2:
        return nums[0], "x", nums[1]
    return 3, "x", 4


def _base_canvas(size: Tuple[int, int], title: str, subtitle: str) -> Tuple[Image.Image, ImageDraw.ImageDraw]:
    width, _ = size
    image = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    draw.rounded_rectangle((20, 18, width - 20, 90), radius=14, fill=PANEL, outline="#334155", width=2)
    draw.text((40, 40), title, fill=TEXT, font=font)
    draw.text((40, 64), subtitle, fill="#CBD5E1", font=font)
    return image, draw


def _boxes_layout(width: int, height: int, groups: int) -> List[Tuple[int, int, int, int]]:
    cols = min(4, max(1, groups))
    rows = (groups + cols - 1) // cols
    box_w = min(220, int(width * 0.18))
    box_h = min(150, int(height * 0.18))
    x_gap = 28
    y_gap = 30
    total_w = cols * box_w + (cols - 1) * x_gap
    start_x = max(40, (width - total_w) // 2)
    start_y = max(120, int(height * 0.2))

    out: List[Tuple[int, int, int, int]] = []
    for i in range(groups):
        r = i // cols
        c = i % cols
        x1 = start_x + c * (box_w + x_gap)
        y1 = start_y + r * (box_h + y_gap)
        out.append((x1, y1, x1 + box_w, y1 + box_h))
    return out


def _draw_boxes(draw: ImageDraw.ImageDraw, boxes: List[Tuple[int, int, int, int]], highlight_idx: int = -1) -> None:
    for i, box in enumerate(boxes):
        outline = HIGHLIGHT if i == highlight_idx else BOX_OUTLINE
        width = 4 if i == highlight_idx else 3
        draw.rounded_rectangle(box, radius=14, fill=BOX_FILL, outline=outline, width=width)


def _draw_dots_in_box(draw: ImageDraw.ImageDraw, box: Tuple[int, int, int, int], count: int) -> None:
    x1, y1, x2, y2 = box
    count = max(0, count)
    if count == 0:
        return

    dot_r = 10
    cols = min(5, max(1, int(count ** 0.5) + 1))
    gap = 8
    cell = dot_r * 2 + gap
    start_x = x1 + 16
    start_y = y1 + 16
    for i in range(count):
        r = i // cols
        c = i % cols
        x = start_x + c * cell
        y = start_y + r * cell
        if x + dot_r * 2 > x2 - 8 or y + dot_r * 2 > y2 - 8:
            break
        draw.ellipse((x, y, x + dot_r * 2, y + dot_r * 2), fill=DOT, outline="#0369A1", width=2)


def render_frames(prompt_json: dict, scene: dict, scene_index: int, canvas_size: Tuple[int, int]) -> List[Image.Image]:
    a, op, b = _parse_mul_div(str(prompt_json.get("problem", "")))
    is_mul = op in {"x", "X", "*"}
    font = ImageFont.load_default()

    if is_mul:
        groups = max(1, min(a, 8))
        per_group = max(1, min(b, 10))
        ans = groups * per_group
    else:
        groups = max(1, min(b, 8))
        total = max(0, a)
        per_group = total // groups if groups > 0 else 0
        ans = per_group
    boxes = _boxes_layout(canvas_size[0], canvas_size[1], groups)

    # Frame 1: empty boxes.
    f1, d1 = _base_canvas(canvas_size, "Step 1", "Show empty groups")
    _draw_boxes(d1, boxes)

    # Frame 2: fill/distribute dots.
    if is_mul:
        f2, d2 = _base_canvas(canvas_size, "Step 2", f"Put {per_group} dots in each of {groups} groups")
        _draw_boxes(d2, boxes)
        for box in boxes:
            _draw_dots_in_box(d2, box, per_group)
    else:
        f2, d2 = _base_canvas(canvas_size, "Step 2", f"Share {a} dots equally into {groups} groups")
        _draw_boxes(d2, boxes)
        for box in boxes:
            _draw_dots_in_box(d2, box, per_group)

    # Frame 3: highlight one group or total.
    if is_mul:
        f3, d3 = _base_canvas(canvas_size, "Step 3", f"Count all dots: {ans}")
        _draw_boxes(d3, boxes)
        for box in boxes:
            _draw_dots_in_box(d3, box, per_group)
        d3.rounded_rectangle((canvas_size[0] - 290, 110, canvas_size[0] - 40, 182), radius=12, fill=PANEL, outline="#475569", width=2)
        d3.text((canvas_size[0] - 260, 132), f"{groups} x {per_group} = {ans}", fill=TEXT, font=font)
    else:
        f3, d3 = _base_canvas(canvas_size, "Step 3", f"Each group has {ans}")
        _draw_boxes(d3, boxes, highlight_idx=0)
        for box in boxes:
            _draw_dots_in_box(d3, box, per_group)
        d3.rounded_rectangle((canvas_size[0] - 290, 110, canvas_size[0] - 40, 182), radius=12, fill=PANEL, outline="#475569", width=2)
        d3.text((canvas_size[0] - 260, 132), f"{a} / {groups} = {ans}", fill=TEXT, font=font)

    return [f1, f2, f3]

