"""
backend/video_engine/tts.py
Deepgram Aura text-to-speech integration.

Sends narration text to Deepgram Aura and returns a .wav file.
Requires DEEPGRAM_API_KEY env var.
"""

import os
import logging
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

DEEPGRAM_TTS_URL = "https://api.deepgram.com/v1/speak"
DEFAULT_VOICE = "aura-asteria-en"  # Warm, teacher-like female voice


def get_deepgram_key() -> str | None:
    return os.getenv("DEEPGRAM_API_KEY")


def synthesize(
    text: str,
    output_path: Path,
    voice: str = DEFAULT_VOICE,
) -> Path | None:
    """
    Convert text to speech using Deepgram Aura.

    Returns the output path on success, None on failure.
    The caller should check the return value and proceed without audio if None.
    """
    api_key = get_deepgram_key()
    if not api_key:
        logger.warning("DEEPGRAM_API_KEY not set — skipping TTS")
        return None

    if not text or not text.strip():
        logger.info("Empty narration text — skipping TTS")
        return None

    try:
        params = {"model": voice}
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json",
        }
        body = {"text": text.strip()}

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                DEEPGRAM_TTS_URL,
                params=params,
                headers=headers,
                json=body,
            )
            resp.raise_for_status()

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(resp.content)

        if output_path.stat().st_size < 100:
            logger.warning("TTS output suspiciously small — may have failed")
            return None

        logger.info(f"TTS audio saved: {output_path} ({output_path.stat().st_size} bytes)")
        return output_path

    except Exception as exc:
        logger.error(f"Deepgram TTS failed: {exc}")
        return None
