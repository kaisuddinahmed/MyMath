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


def sanitize_for_tts(text: str) -> str:
    """
    Replace mathematical symbols with spoken words so the TTS engine pronounces them correctly.
    """
    import re
    replacements = {
        "÷": " divided by ",
        "×": " times ",
        "=": " equals ",
        "+": " plus ",
    }
    for symbol, word in replacements.items():
        text = text.replace(symbol, word)
    
    # Handle minus separately to avoid breaking hyphenated words
    text = text.replace(" - ", " minus ")
    
    # Deepgram Aura Asteria has a phonetic glitch where it slurs "also" into "olo". 
    # Phonetically correcting it prevents the slur.
    text = text.replace(" also ", " all so ").replace("Also ", "All so ")
    
    # Clean up any duplicate spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text


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
        spoken_text = sanitize_for_tts(text)
        params = {"model": voice}
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json",
        }
        body = {"text": spoken_text}

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
