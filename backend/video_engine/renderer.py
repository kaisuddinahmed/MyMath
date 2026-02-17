from __future__ import annotations

import aifc
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from PIL import Image, ImageDraw, ImageFont

from backend.video_engine.templates import counters, fraction, groups

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
CANVAS_SIZE = (1280, 720)
FPS = 24


def _sanitize_output_name(name: str) -> str:
    base = (name or "output.mp4").strip()
    base = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    if not base.endswith(".mp4"):
        base += ".mp4"
    return base


def _set_duration(clip, seconds: float):
    if hasattr(clip, "set_duration"):
        return clip.set_duration(seconds)
    return clip.with_duration(seconds)


def _set_audio(clip, audio_clip):
    if hasattr(clip, "set_audio"):
        return clip.set_audio(audio_clip)
    return clip.with_audio(audio_clip)


def _template_key(name: str) -> str:
    key = (name or "").strip().lower()
    if key in {"counters_add_sub", "counters_add", "counters_remove", "number_line_jump", "number_line_back"}:
        return "counters_add_sub"
    if key in {"group_boxes", "sharing_groups", "equal_groups", "arrays"}:
        return "group_boxes"
    if key in {"fraction_pie", "fraction_bar"}:
        return "fraction_pie"
    return "counters_add_sub"


def _select_template_renderer(template_name: str) -> Callable[[dict, dict, int, tuple[int, int]], List[Image.Image]]:
    key = _template_key(template_name)
    if key == "group_boxes":
        return groups.render_frames
    if key == "fraction_pie":
        return fraction.render_frames
    return counters.render_frames


def _draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    max_width: int,
    font: ImageFont.ImageFont,
    fill: str,
) -> int:
    words = (text or "").split()
    if not words:
        return y

    line = ""
    line_h = 20
    for word in words:
        candidate = (line + " " + word).strip()
        width = draw.textbbox((0, 0), candidate, font=font)[2]
        if width <= max_width:
            line = candidate
            continue
        draw.text((x, y), line, fill=fill, font=font)
        y += line_h
        line = word

    if line:
        draw.text((x, y), line, fill=fill, font=font)
        y += line_h
    return y


def _annotate_frame(image: Image.Image, prompt_json: Dict[str, Any], scene: Dict[str, Any], scene_idx: int, frame_idx: int, frame_total: int) -> None:
    width, height = image.size
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()

    title = str(prompt_json.get("title", "MyMath"))
    draw.rounded_rectangle((16, 16, width - 16, 46), radius=8, fill="#111827")
    draw.text((28, 24), title[:80], fill="#F8FAFC", font=font)
    draw.text((width - 210, 24), f"Scene {scene_idx}  Frame {frame_idx}/{frame_total}", fill="#CBD5E1", font=font)

    narration = str(scene.get("narration", "")).strip()
    if narration:
        draw.rounded_rectangle((16, height - 80, width - 16, height - 16), radius=10, fill="#111827")
        _draw_wrapped_text(draw, narration[:180], 28, height - 70, width - 56, font, "#F8FAFC")


def _build_scene_frames(prompt_json: Dict[str, Any], scene: Dict[str, Any], scene_idx: int) -> List[Image.Image]:
    renderer = _select_template_renderer(str(prompt_json.get("visual_template", "")))
    frames = renderer(prompt_json, scene, scene_idx, CANVAS_SIZE)
    if not frames:
        fallback = Image.new("RGB", CANVAS_SIZE, "#0F172A")
        frames = [fallback]

    out: List[Image.Image] = []
    total = len(frames)
    for idx, frame in enumerate(frames, start=1):
        if frame.mode != "RGB":
            frame = frame.convert("RGB")
        _annotate_frame(frame, prompt_json, scene, scene_idx, idx, total)
        out.append(frame)
    return out


def _scene_duration(scene: Dict[str, Any], fallback: int) -> int:
    try:
        d = int(scene.get("duration", fallback))
    except (TypeError, ValueError):
        d = fallback
    return max(1, d)


def _text_to_audio(text: str, output_path: Path) -> bool:
    if not text.strip():
        return False
    try:
        import pyttsx3
    except Exception:
        return False

    try:
        engine = pyttsx3.init()
        engine.setProperty("rate", 165)
        engine.save_to_file(text, str(output_path))
        engine.runAndWait()
        return output_path.exists() and output_path.stat().st_size > 0
    except Exception:
        return False


def _load_tts_audio_clip(audio_path: Path):
    try:
        import numpy as np
        try:
            from moviepy.audio.AudioClip import AudioArrayClip
        except Exception:
            from moviepy import AudioArrayClip
    except Exception:
        return None

    try:
        with aifc.open(str(audio_path), "rb") as af:
            channels = af.getnchannels()
            sample_width = af.getsampwidth()
            frame_rate = af.getframerate()
            raw = af.readframes(af.getnframes())
    except Exception:
        return None

    if sample_width == 1:
        dtype = np.int8
        scale = 127.0
    elif sample_width == 2:
        dtype = np.int16
        scale = 32767.0
    elif sample_width == 4:
        dtype = np.int32
        scale = 2147483647.0
    else:
        return None

    arr = np.frombuffer(raw, dtype=dtype).astype("float32") / scale
    arr = arr.reshape(-1, channels if channels > 0 else 1)
    try:
        return AudioArrayClip(arr, fps=frame_rate)
    except Exception:
        return None


def render_video(prompt_json: Dict[str, Any], output_name: str = "output.mp4") -> Dict[str, Any]:
    try:
        try:
            from moviepy.editor import ImageClip, concatenate_videoclips
        except Exception:
            from moviepy import ImageClip, concatenate_videoclips
    except Exception as exc:
        raise RuntimeError("moviepy is not installed. Run: pip install moviepy") from exc

    scenes = prompt_json.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError("video_prompt_json must include a non-empty 'scenes' list.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / _sanitize_output_name(output_name)
    temp_dir = Path(tempfile.mkdtemp(prefix="mymath_video_"))

    clips = []
    final_clip = None
    audio_clip = None
    audio_ok = False
    duration_total = 0

    try:
        fallback = max(2, int(prompt_json.get("duration_seconds", 30) / max(1, len(scenes))))

        for scene_idx, scene in enumerate(scenes, start=1):
            scene_duration = _scene_duration(scene, fallback)
            duration_total += scene_duration

            frames = _build_scene_frames(prompt_json, scene, scene_idx)
            frame_duration = max(0.35, scene_duration / max(1, len(frames)))

            for frame_idx, frame in enumerate(frames, start=1):
                frame_path = temp_dir / f"scene_{scene_idx:02d}_frame_{frame_idx:02d}.png"
                frame.save(frame_path, format="PNG")
                clip = ImageClip(str(frame_path))
                clip = _set_duration(clip, frame_duration)
                clips.append(clip)

        final_clip = concatenate_videoclips(clips, method="compose")

        narration_text = " ".join(str(s.get("narration", "")).strip() for s in scenes if s.get("narration"))
        narration_path = temp_dir / "narration.aiff"
        audio_ok = _text_to_audio(narration_text, narration_path)

        if audio_ok:
            audio_clip = _load_tts_audio_clip(narration_path)
            if audio_clip is not None:
                final_clip = _set_audio(final_clip, audio_clip)
                final_clip.write_videofile(str(output_path), fps=FPS, codec="libx264", audio_codec="aac")
            else:
                audio_ok = False
                final_clip.write_videofile(str(output_path), fps=FPS, codec="libx264", audio=False)
        else:
            final_clip.write_videofile(str(output_path), fps=FPS, codec="libx264", audio=False)

        return {
            "output_path": str(output_path.resolve()),
            "duration_seconds": duration_total,
            "used_template": _template_key(str(prompt_json.get("visual_template", ""))),
            "audio_generated": audio_ok,
        }
    finally:
        for clip in clips:
            try:
                clip.close()
            except Exception:
                pass

        if audio_clip is not None:
            try:
                audio_clip.close()
            except Exception:
                pass

        if final_clip is not None:
            try:
                final_clip.close()
            except Exception:
                pass

        shutil.rmtree(temp_dir, ignore_errors=True)
