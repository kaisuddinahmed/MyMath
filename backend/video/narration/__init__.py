"""
backend/video/narration/
========================
Deterministic narration builders, one per curriculum × grade.

Each builder receives a SolveResult and returns an ordered list of NarrationBeats.
A NarrationBeat is a single unit of narration that maps 1-to-1 with a scene.

Flow:
    SolveResult
      → router.build_narration(solve_result, grade, curriculum)
      → list[NarrationBeat]
      → pipeline converts each beat to a scene dict
"""
from .base import NarrationBeat

__all__ = ["NarrationBeat"]
