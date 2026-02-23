"""
backend/api/routes/extract.py
Problem extraction endpoint (OCR from image/PDF).
"""
from fastapi import APIRouter, HTTPException, Request
from backend.api.schemas import ExtractProblemResponse
from backend.problem_extractor import extract_math_problem_from_upload

router = APIRouter()


@router.post("/extract-problem", response_model=ExtractProblemResponse)
async def extract_problem_endpoint(request: Request):
    try:
        form = await request.form()
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not parse uploaded form data. Send multipart/form-data with field 'file'. "
                "If server dependency is missing, install: python-multipart."
            ),
        )

    file = form.get("file")
    if file is None:
        raise HTTPException(status_code=400, detail="Missing file field. Use form field name 'file'.")

    filename = getattr(file, "filename", None) or "upload"
    content_type = getattr(file, "content_type", None) or ""
    read_fn = getattr(file, "read", None)
    if read_fn is None:
        raise HTTPException(status_code=400, detail="Invalid upload object.")

    try:
        file_bytes = await read_fn()
    except TypeError:
        file_bytes = read_fn()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {exc}")

    if not isinstance(file_bytes, (bytes, bytearray)):
        raise HTTPException(status_code=400, detail="Uploaded file content is invalid.")

    try:
        parsed = extract_math_problem_from_upload(
            file_bytes=bytes(file_bytes),
            filename=filename,
            content_type=content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")

    return ExtractProblemResponse(**parsed)
