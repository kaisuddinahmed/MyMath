"""
backend/config.py — backward-compatible shim.
Imports from the new canonical location: backend/core/config.py
"""
from backend.core.config import load_json, TOPIC_MAP, GRADE_STYLE, TOPIC_KEYWORDS  # noqa: F401
