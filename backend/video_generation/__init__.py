"""
Lean video generation orchestration module.
Handles: LLM prompt building → TTS audio generation → Remotion rendering.
"""

from .master_prompt import build_master_prompt, MASTER_PROMPT_TEMPLATE

__all__ = [
    "build_master_prompt",
    "MASTER_PROMPT_TEMPLATE",
]
