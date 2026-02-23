"""
backend/api/routes/video.py
Video render endpoint.
"""
from pathlib import Path
from fastapi import APIRouter, HTTPException
from jsonschema import validate, ValidationError
from backend.api.schemas import RenderVideoRequest, RenderVideoResponse
from backend.core.prompt_validator import VIDEO_SCHEMA

router = APIRouter()


@router.post("/render-video", response_model=RenderVideoResponse)
def render_video_endpoint(req: RenderVideoRequest):
    try:
        validate(instance=req.video_prompt_json, schema=VIDEO_SCHEMA or {})
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid video JSON: {exc.message}")

    try:
        from backend.video_engine.renderer import render_video
        result = render_video(req.video_prompt_json, req.output_name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Render failed: {exc}")

    return RenderVideoResponse(
        output_path=result["output_path"],
        output_url=f"/videos/{Path(result['output_path']).name}",
        duration_seconds=int(result["duration_seconds"]),
        used_template=str(result.get("used_template", "")),
        audio_generated=bool(result.get("audio_generated", False)),
    )
