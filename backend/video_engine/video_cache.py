"""
backend/video_engine/video_cache.py
Simple file-based video cache keyed by SHA-256(question + grade).

The cache index is stored at output/cache_index.json.
"""

import hashlib
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
CACHE_INDEX_PATH = OUTPUT_DIR / "cache_index.json"


def _load_index() -> dict:
    if CACHE_INDEX_PATH.exists():
        try:
            return json.loads(CACHE_INDEX_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_index(index: dict) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_INDEX_PATH.write_text(json.dumps(index, indent=2))


def cache_key(question: str, grade: int) -> str:
    """Deterministic key from question + grade."""
    raw = f"{question.strip().lower()}|{grade}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def lookup(key: str) -> Optional[str]:
    """
    Return the filename of the cached video if it exists on disk.
    Returns None on cache miss.
    """
    index = _load_index()
    filename = index.get(key)
    if not filename:
        return None

    video_path = OUTPUT_DIR / filename
    if video_path.exists() and video_path.stat().st_size > 0:
        logger.info(f"Cache HIT: {key} → {filename}")
        return filename

    # Stale entry — remove from index
    logger.info(f"Cache STALE: {key} — file missing, removing entry")
    index.pop(key, None)
    _save_index(index)
    return None


def register(key: str, filename: str) -> None:
    """Register a newly-rendered video in the cache."""
    index = _load_index()
    index[key] = filename
    _save_index(index)
    logger.info(f"Cache REGISTER: {key} → {filename}")


def video_url_from_filename(filename: str) -> str:
    """Convert filename to the URL path served by FastAPI static mount."""
    return f"/videos/{filename}"
