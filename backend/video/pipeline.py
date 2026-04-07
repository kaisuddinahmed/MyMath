"""
backend/video/pipeline.py
==========================
Video pipeline.

Flow:
    run(solve_result, child) → dict with video_url + scene metadata

Steps:
  1. build_narration()  — deterministic beats from grade/curriculum builder
  2. beats_to_scenes()  — each NarrationBeat → scene dict (no LLM)
  3. TTS per scene      — audio length becomes ground truth for scene duration
  4. Remotion render    — scene JSON + audio → mp4
  5. Cache              — keyed by question + grade

No LLM for supported grade/curriculum combinations.
"""
from __future__ import annotations

import logging
import os
import shutil
import tempfile
import wave
from pathlib import Path
from typing import Optional

from backend.video.narration.router import build_narration
from backend.video.cache import cache_key, lookup as cache_lookup, register as cache_register, video_url_from_filename, OUTPUT_DIR
from backend.video.tts import synthesize as tts_synthesize

logger = logging.getLogger(__name__)

FPS = 30
BACKEND_PORT = int(os.environ.get("BACKEND_PORT", "1233"))
REMOTION_URL = f"http://localhost:{os.environ.get('REMOTION_PORT', '1235')}"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run(solve_result, child: dict) -> dict:
    """
    Full pipeline: SolveResult + child profile → rendered video URL.

    Returns a dict with:
        video_url       str | None
        video_cached    bool
        scenes          list[dict]  — the scene JSON passed to Remotion
        topic           str
        answer          str
    """
    grade      = child.get("class_level", 1)
    curriculum = child.get("preferred_curriculum", "nctb")
    question   = getattr(solve_result, "question", "")
    answer     = str(getattr(solve_result, "answer", ""))
    topic      = getattr(solve_result, "topic", "")

    # ── Cache check ──────────────────────────────────────────────────────────
    key = cache_key(question, grade)
    cached = cache_lookup(key)
    if cached:
        logger.info("Cache HIT for '%s' grade %s", question[:60], grade)
        return {
            "video_url":    video_url_from_filename(cached),
            "video_cached": True,
            "scenes":       [],
            "topic":        topic,
            "answer":       answer,
        }

    # ── Step 1: Build narration beats ────────────────────────────────────────
    try:
        beats = build_narration(solve_result, grade=grade, curriculum=curriculum)
    except NotImplementedError as exc:
        logger.warning("No narration builder: %s", exc)
        return {"video_url": None, "video_cached": False, "scenes": [], "topic": topic, "answer": answer}

    # ── Step 2: Beats → scene dicts ──────────────────────────────────────────
    # MathVideo.tsx handles the celebration burst automatically from correct_answer
    scenes = [b.to_scene_dict() for b in beats if not b.is_celebration]

    script = {
        "title":             topic,
        "grade":             grade,
        "topic":             topic,
        "problem":           question,
        "correct_answer":    answer,
        "visual_template":   "default",
        "duration_seconds":  0,          # will be computed by Remotion from sceneDurations
        "checkpoint_question": "",
        "practice_problem":  {"question": "", "answer": ""},
        "scenes":            scenes,
    }

    # ── Step 3: TTS per scene ────────────────────────────────────────────────
    audio_paths = _generate_tts(scenes, key)

    # ── Step 4: Compute per-scene durations from audio files ─────────────────
    scene_durations = _compute_scene_durations(audio_paths)

    # ── Step 5: Build audioUrls served via FastAPI /videos/ ──────────────────
    audio_urls = _build_audio_urls(audio_paths)

    # ── Step 6: Remotion render ──────────────────────────────────────────────
    render_result = _render(script, audio_urls, scene_durations)

    if render_result and render_result.get("outputName"):
        filename = render_result["outputName"]
        cache_register(key, filename)
        url = video_url_from_filename(filename)
        logger.info("Render complete: %s", filename)
        return {
            "video_url":    url,
            "video_cached": False,
            "scenes":       scenes,
            "topic":        topic,
            "answer":       answer,
        }

    logger.error("Render failed for '%s'", question[:60])
    return {"video_url": None, "video_cached": False, "scenes": scenes, "topic": topic, "answer": answer}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _generate_tts(scenes: list[dict], key: str) -> list[Optional[Path]]:
    """Generate TTS wav files for each scene. Returns list of Paths (or None)."""
    tmp_dir = Path(tempfile.mkdtemp(prefix="mymath_tts_"))
    audio_paths: list[Optional[Path]] = []
    for i, scene in enumerate(scenes):
        narration = str(scene.get("narration", "")).strip()
        if not narration:
            audio_paths.append(None)
            continue
        audio_output = tmp_dir / f"{key}_scene{i}.wav"
        audio_path = tts_synthesize(narration, audio_output)
        if audio_path and Path(audio_path).exists():
            dest = OUTPUT_DIR / Path(audio_path).name
            shutil.copy2(str(audio_path), str(dest))
            audio_paths.append(dest)
        else:
            audio_paths.append(None)
    return audio_paths


def _wav_duration_frames(path: Path, fps: int = FPS) -> int:
    """Return the duration of a WAV file in Remotion frames."""
    try:
        with wave.open(str(path), "rb") as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            seconds = frames / rate
            return max(1, round(seconds * fps))
    except Exception as exc:
        logger.warning("Could not read WAV duration for %s: %s", path, exc)
        return 4 * fps  # fallback 4s


def _compute_scene_durations(audio_paths: list[Optional[Path]]) -> list[int]:
    """Return per-scene duration in frames. Falls back to 4s for scenes without audio."""
    durations = []
    for p in audio_paths:
        if p and p.exists():
            durations.append(_wav_duration_frames(p))
        else:
            durations.append(4 * FPS)  # 4s default for scenes with no narration
    return durations


def _build_audio_urls(audio_paths: list[Optional[Path]]) -> list[Optional[str]]:
    """Convert local audio file paths to HTTP URLs served by FastAPI."""
    urls = []
    for p in audio_paths:
        if p and p.exists():
            filename = p.name
            urls.append(f"http://localhost:{BACKEND_PORT}/videos/{filename}")
        else:
            urls.append(None)
    return urls


def _render(script: dict, audio_urls: list, scene_durations: list) -> Optional[dict]:
    """Call the Remotion renderer via HTTP."""
    import requests
    try:
        payload = {
            "script":         script,
            "audioUrls":      audio_urls,
            "sceneDurations": scene_durations,
        }
        resp = requests.post(f"{REMOTION_URL}/render", json=payload, timeout=120)
        if resp.ok:
            return resp.json()
        logger.error("Remotion render HTTP %s: %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.error("Remotion render error: %s", exc)
    return None
