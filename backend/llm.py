"""
backend/llm.py — backward-compatible shim.
Imports from the new canonical location: backend/core/llm.py
"""
from backend.core.llm import get_client, get_model  # noqa: F401
