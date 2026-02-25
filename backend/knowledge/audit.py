"""
backend/knowledge/audit.py
Utility for creating AuditLog entries in the knowledge database.
"""
from __future__ import annotations

from typing import Any, Dict

from sqlalchemy.orm import Session

from backend.knowledge.models import AuditLog


def log_audit(session: Session, payload_dict: Dict[str, Any]) -> AuditLog:
    retrieved = payload_dict.get("retrieved_chunk_ids") or []
    if not isinstance(retrieved, list):
        retrieved = []

    prompt_json = payload_dict.get("prompt_json")
    if prompt_json is not None and not isinstance(prompt_json, dict):
        prompt_json = None

    row = AuditLog(
        child_id=str(payload_dict["child_id"]).strip() if payload_dict.get("child_id") else None,
        question=str(payload_dict.get("question") or "").strip(),
        detected_topic=str(payload_dict.get("detected_topic") or "").strip() or "unknown",
        curriculum_id=str(payload_dict["curriculum_id"]).strip() if payload_dict.get("curriculum_id") else None,
        class_level=payload_dict.get("class_level"),
        retrieved_chunk_ids=[str(x) for x in retrieved if str(x).strip()],
        prompt_json=prompt_json,
        final_prompt_score=int(payload_dict.get("final_prompt_score") or 0),
        schema_valid=bool(payload_dict.get("schema_valid")),
        video_path=(str(payload_dict.get("video_path")).strip() if payload_dict.get("video_path") else None),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row
