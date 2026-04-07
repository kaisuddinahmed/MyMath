"""
backend/video/narration/router.py
==================================
Routes a solved problem to the correct narration builder based on
curriculum and grade.

Usage:
    from backend.video.narration.router import build_narration
    beats = build_narration(solve_result, grade=1, curriculum="nctb")
"""
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.math_engine.engine import SolveResult
from .base import NarrationBeat


def build_narration(
    solve_result,
    grade: int,
    curriculum: str = "nctb",
) -> list[NarrationBeat]:
    """
    Dispatch to the correct grade/curriculum narration builder.

    Returns an ordered list of NarrationBeats.
    The last beat is always a Celebration beat (added here, not in builders).

    Raises NotImplementedError if no builder exists yet for the combination.
    """
    beats = _dispatch(solve_result, grade, curriculum)
    # Ensure celebration is always the final beat
    if not beats or not beats[-1].is_celebration:
        beats.append(NarrationBeat(
            text="",
            action="CELEBRATION",
            is_celebration=True,
        ))
    return beats


def _dispatch(solve_result, grade: int, curriculum: str) -> list[NarrationBeat]:
    curriculum = (curriculum or "nctb").lower()

    if curriculum == "nctb":
        if grade == 1:
            from .nctb.class_1 import build as build_nctb_class1
            return build_nctb_class1(solve_result)
        # Grade 2, 3, ... — add builders here as they are built out
        # if grade == 2:
        #     from .nctb.class_2 import build as build_nctb_class2
        #     return build_nctb_class2(solve_result)

    # Fallback: not yet implemented
    raise NotImplementedError(
        f"No narration builder for curriculum='{curriculum}' grade={grade}. "
        f"Topic was: {getattr(solve_result, 'topic', '?')}"
    )
