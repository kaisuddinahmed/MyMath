"""
backend/main.py — Thin entrypoint.

All logic lives in the 5 isolated layers:
  backend/core/         — LLM client, config, prompt validation
  backend/math_engine/  — All math logic (upgraded class-by-class)
  backend/knowledge/    — Vector DB, RAG, activity log
  backend/video_engine/ — Video renderer (unchanged)
  backend/api/          — HTTP routes and schemas

Run with:
  uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233
"""
from backend.api.app import create_app

app = create_app()
