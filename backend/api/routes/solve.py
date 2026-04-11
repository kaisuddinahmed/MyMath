"""
backend/api/routes/solve.py
============================
Solve + render endpoints.

  POST /solve                    — deterministic solve, no video
  POST /solve-and-render/by-child — full pipeline (primary endpoint)
"""
import logging
import re
from fastapi import APIRouter, HTTPException

from backend.api.schemas import (
    SolveRequest, SolveByChildRequest,
    SolveResponse, SolveAndPromptResponse,
    Step, ReviewSummary,
)
from backend.api.routes.children import CHILDREN
from backend.math_engine.engine import solve as engine_solve, build_review
from backend.knowledge.activity import append_activity

logger = logging.getLogger(__name__)
router = APIRouter()

# Matches equations like "5 + 2 = 7", "7 - 3 = 4", "3 x 2 = 6", "8 ÷ 2 = 4"
_EQ_RE = re.compile(r"(\d+\s*[+\-x×÷*/]\s*\d+)\s*=\s*(\d+)")


def _make_practice(result) -> dict | None:
    """
    Extract a practice question/answer from smaller_example.
    Returns {"question": str, "answer": str} or None.
    """
    example = getattr(result, "smaller_example", "") or ""
    m = _EQ_RE.search(example)
    if not m:
        return None
    equation = m.group(1).strip()
    answer = m.group(2).strip()
    return {"question": f"What is {equation}?", "answer": answer}


# ---------------------------------------------------------------------------
# POST /solve  — simple deterministic solve (no video)
# ---------------------------------------------------------------------------

@router.post("/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    result = engine_solve(req.question, req.grade)
    return SolveResponse(
        topic=result.topic,
        verified_answer=result.answer,
        verified_steps=[Step(title=s.title, text=s.text) for s in result.steps],
        template=result.template,
    )


# ---------------------------------------------------------------------------
# POST /solve-and-render/by-child  — full pipeline
# ---------------------------------------------------------------------------

@router.post("/solve-and-render/by-child", response_model=SolveAndPromptResponse)
def solve_and_render_by_child(req: SolveByChildRequest):
    child = CHILDREN.get(req.child_id)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    result = engine_solve(
        req.question,
        child["class_level"],
        pre_solved_answer=req.pre_solved_answer,
        pre_solved_steps=req.pre_solved_steps,
    )

    result.question = req.question

    from backend.video.pipeline import run as run_pipeline
    video = run_pipeline(result, child)

    review_data = build_review(result.topic, result.template, result.is_above_grade, [])
    review = ReviewSummary(
        concept=review_data["concept"],
        objects_used=review_data["objects_used"],
        prerequisite_used=review_data["prerequisite_used"],
        common_mistake=review_data["common_mistake"],
    )

    append_activity(
        child_id=req.child_id,
        question=req.question,
        topic=result.topic,
        template=result.template,
        score=0,
    )

    return SolveAndPromptResponse(
        topic=result.topic,
        verified_answer=result.answer,
        verified_steps=[Step(title=s.title, text=s.text) for s in result.steps],
        template=result.template,
        min_grade_for_topic=result.min_grade_for_topic,
        is_above_grade=result.is_above_grade,
        review=review,
        attempts=[],
        final_prompt="",
        final_passed=True,
        final_score=100,
        video_prompt_json={
            "scenes": video.get("scenes", []),
            "practice_problem": _make_practice(result),
        },
        schema_valid=True,
        video_url=video.get("video_url"),
        video_cached=video.get("video_cached", False),
        video_generated_by="pipeline",
    )
