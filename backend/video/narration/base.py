"""
backend/video/narration/base.py
================================
Core data types shared across all narration builders.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NarrationBeat:
    """
    A single narration unit.  One beat = one Remotion scene.

    The pipeline converts a list[NarrationBeat] directly into the scene JSON
    that Remotion consumes.  No LLM involved.

    Fields
    ------
    text        Narration spoken aloud (drives TTS audio length = scene duration).
    action      Remotion action string (e.g. 'SHOW_SMALL_ADDITION', 'ADD_ITEMS').
    equation    Equation string shown on screen (e.g. '3 + 2', '3 + 2 = 5').
    item_type   SVG item identifier (e.g. 'FLOWER_SVG', 'BLOCK_SVG').
    items_count Number of items to show (ADD_ITEMS / REMOVE_ITEMS scenes).
    extra       Any additional scene fields (choreography_total, groups, etc.).
    is_celebration  If True, this beat becomes the Celebration scene.
    """
    text: str
    action: str
    equation: str = ""
    item_type: str = "BLOCK_SVG"
    items_count: int = 0
    mode: str = ""   # visual mode: "story" | "joining" | "abstract" | ""
    extra: dict = field(default_factory=dict)
    is_celebration: bool = False

    def to_scene_dict(self) -> dict:
        """Convert to the scene dict format consumed by Remotion / the pipeline."""
        scene: dict = {
            "action":          self.action,
            "narration":       self.text,
            "animation_style": "STANDARD",  # required by DirectorScene TS type
            "duration":        5,            # placeholder; overridden by sceneDurations
        }
        if self.equation:
            scene["equation"] = self.equation
        if self.item_type:
            scene["item_type"] = self.item_type
        if self.items_count:
            scene["items_count"] = self.items_count
        if self.mode:
            scene["mode"] = self.mode
        scene.update(self.extra)
        return scene
