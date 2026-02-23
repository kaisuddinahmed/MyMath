"""
backend/api/schemas.py
All Pydantic request/response models for the API layer.
No logic here — only data shapes.
"""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional


Grade = Literal[1, 2, 3, 4, 5]


# --- Children ---

class ChildProfileCreate(BaseModel):
    child_name: str
    age: int = Field(..., ge=4, le=12)
    class_level: int = Field(..., ge=1, le=5)


class ChildProfilePatch(BaseModel):
    child_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=4, le=12)
    class_level: Optional[int] = Field(None, ge=1, le=5)


class ChildProfile(BaseModel):
    child_id: str
    child_name: str
    age: int
    class_level: int


# --- Solve ---

class SolveRequest(BaseModel):
    grade: Grade = Field(..., description="Grade level (1-5)")
    question: str = Field(..., min_length=1, max_length=500)


class SolveByChildRequest(BaseModel):
    child_id: str
    question: str = Field(..., min_length=1, max_length=500)


class Step(BaseModel):
    title: str
    text: str


class SolveResponse(BaseModel):
    topic: str
    answer: str
    steps: List[Step]
    smaller_example: str


class PromptAttempt(BaseModel):
    attempt: int
    prompt: str
    checks: dict
    score: int
    passed: bool


class ReviewSummary(BaseModel):
    concept: str
    objects_used: str
    prerequisite_used: str
    common_mistake: str


class SolveAndPromptResponse(BaseModel):
    topic: str
    verified_answer: str
    verified_steps: List[Step]
    template: str
    min_grade_for_topic: int
    is_above_grade: bool
    review: ReviewSummary
    attempts: List[PromptAttempt]
    final_prompt: str
    final_passed: bool
    final_score: int
    video_prompt_json: Optional[Dict[str, Any]]
    schema_valid: bool
    # V2 video delivery fields
    video_url: Optional[str] = None
    video_cached: bool = False
    video_generated_by: str = "none"  # "remotion" | "template" | "none"


# --- Video ---

class RenderVideoRequest(BaseModel):
    video_prompt_json: Dict[str, Any]
    output_name: str = "output.mp4"


class RenderVideoResponse(BaseModel):
    output_path: str
    output_url: str
    duration_seconds: int
    used_template: str
    audio_generated: bool


# --- Extract Problem ---

class GeometryParseSummary(BaseModel):
    analysis_available: bool
    has_diagram: bool
    line_segments: int
    circles: int
    parallel_pairs: int
    perpendicular_pairs: int
    point_labels: List[str]
    shape_hints: List[str]


class ExtractProblemResponse(BaseModel):
    question: str
    extracted_text: str
    source_type: Literal["image", "pdf"]
    ocr_engine: str
    confidence: float
    geometry: GeometryParseSummary
    notes: List[str]


# --- Activity ---

class ActivityRecord(BaseModel):
    child_id: str
    question: str
    topic: str
    template: str
    score: int
    timestamp: str
