from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from backend.knowledge.db import get_session_factory
from backend.core.llm import get_client, get_model
from backend.knowledge.models import Chunk

DEFAULT_LIMIT = 500
DEFAULT_BATCH_SIZE = 100
RULES_PATH = Path(__file__).resolve().parent / "topic_rules.json"

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "if",
    "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "their",
    "then", "there", "these", "they", "this", "to", "was", "we", "with", "you",
    "your", "students", "student", "teacher", "lesson", "chapter", "page", "book",
    "class", "grade", "math", "example", "examples", "question", "questions",
}


@dataclass
class TagResult:
    topic: str | None
    subtopic: str | None
    difficulty: str | None
    keywords: list[str]
    used_llm: bool = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Auto-tag chunk rows by topic/subtopic/difficulty.")
    parser.add_argument("--book_id", required=True, help="Book UUID")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="Max chunks to process (default: 500)")
    parser.add_argument("--batch_size", type=int, default=DEFAULT_BATCH_SIZE, help="Commit batch size (default: 100)")
    return parser.parse_args()


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def load_rules(path: Path = RULES_PATH) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Missing topic rules file: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _count_keyword_hits(text_lower: str, keywords: list[str]) -> int:
    score = 0
    for kw in keywords:
        token = kw.strip().lower()
        if not token:
            continue
        if " " in token:
            if token in text_lower:
                score += 2
        else:
            if re.search(rf"\b{re.escape(token)}\b", text_lower):
                score += 1
    return score


def infer_topic_subtopic(text: str, rules: dict[str, Any]) -> tuple[str | None, str | None, int]:
    text_lower = normalize(text).lower()
    topics = rules.get("topics", {})
    if not isinstance(topics, dict):
        return None, None, 0

    best_topic: str | None = None
    best_topic_score = 0
    best_subtopic: str | None = None

    for topic, cfg in topics.items():
        topic_keywords = cfg.get("keywords", []) if isinstance(cfg, dict) else []
        topic_score = _count_keyword_hits(text_lower, list(topic_keywords))

        subtopic_name: str | None = None
        subtopic_score = 0
        subtopics = cfg.get("subtopics", {}) if isinstance(cfg, dict) else {}
        if isinstance(subtopics, dict):
            for name, kw_list in subtopics.items():
                score = _count_keyword_hits(text_lower, list(kw_list))
                if score > subtopic_score:
                    subtopic_score = score
                    subtopic_name = name

        total_score = topic_score + subtopic_score
        if total_score > best_topic_score:
            best_topic = topic
            best_topic_score = total_score
            best_subtopic = subtopic_name

    if best_topic_score <= 0:
        return None, None, 0
    return best_topic, best_subtopic, best_topic_score


def infer_difficulty(text: str, class_level: int, rules: dict[str, Any]) -> str:
    text_lower = normalize(text).lower()
    difficulty_cfg = rules.get("difficulty", {})
    easy_kw = difficulty_cfg.get("easy_keywords", []) if isinstance(difficulty_cfg, dict) else []
    med_kw = difficulty_cfg.get("medium_keywords", []) if isinstance(difficulty_cfg, dict) else []
    hard_kw = difficulty_cfg.get("hard_keywords", []) if isinstance(difficulty_cfg, dict) else []

    if _count_keyword_hits(text_lower, list(hard_kw)) > 0:
        return "hard"
    if _count_keyword_hits(text_lower, list(med_kw)) > 0:
        return "medium"
    if _count_keyword_hits(text_lower, list(easy_kw)) > 0:
        return "easy"

    wc = len(text_lower.split())
    if class_level <= 2:
        return "easy" if wc < 200 else "medium"
    if class_level <= 4:
        return "medium" if wc < 260 else "hard"
    return "hard" if wc >= 180 else "medium"


def extract_keywords(text: str, top_n: int = 10) -> list[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9'-]{2,}", normalize(text).lower())
    filtered = [t for t in tokens if t not in STOPWORDS and not t.isdigit()]
    if not filtered:
        return []

    freq = Counter(filtered)
    ranked = sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))
    return [word for word, _ in ranked[:top_n]]


def _extract_json_object(raw: str) -> dict[str, Any] | None:
    raw = raw.strip()
    if not raw:
        return None
    try:
        obj = json.loads(raw)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        pass

    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        try:
            obj = json.loads(raw[start : end + 1])
            return obj if isinstance(obj, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def llm_tag_chunk(text: str, allowed_topics: list[str]) -> tuple[str | None, str | None, str | None]:
    client = get_client()
    model = get_model()
    prompt = (
        "Return ONLY JSON with keys topic, subtopic, difficulty.\n"
        f"Allowed topics: {', '.join(allowed_topics)}.\n"
        "Allowed difficulty: easy, medium, hard.\n"
        "If uncertain, choose the closest topic.\n"
        f"Text:\n{text[:3000]}"
    )
    resp = client.chat.completions.create(
        model=model,
        temperature=0.1,
        messages=[
            {"role": "system", "content": "You classify curriculum text chunks."},
            {"role": "user", "content": prompt},
        ],
    )
    content = resp.choices[0].message.content.strip() if resp.choices else ""
    data = _extract_json_object(content)
    if not data:
        return None, None, None

    topic = str(data.get("topic", "")).strip().lower() or None
    subtopic = str(data.get("subtopic", "")).strip() or None
    difficulty = str(data.get("difficulty", "")).strip().lower() or None
    if topic not in allowed_topics:
        topic = None
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = None
    return topic, subtopic, difficulty


def tag_chunk(chunk: Chunk, rules: dict[str, Any], use_llm: bool) -> TagResult:
    text = normalize(chunk.text)
    if not text:
        return TagResult(None, None, None, [], False)

    topic, subtopic, score = infer_topic_subtopic(text, rules)
    difficulty = infer_difficulty(text, int(chunk.class_level or 1), rules)
    keywords = extract_keywords(text, top_n=10)

    used_llm = False
    if use_llm and (topic is None or score < 2):
        try:
            allowed = list((rules.get("topics", {}) or {}).keys())
            llm_topic, llm_subtopic, llm_difficulty = llm_tag_chunk(text, allowed)
            if llm_topic is not None:
                topic = llm_topic
                subtopic = llm_subtopic
                if llm_difficulty is not None:
                    difficulty = llm_difficulty
                used_llm = True
        except Exception:
            # LLM fallback is optional; keep deterministic tags if request fails.
            pass

    return TagResult(topic=topic, subtopic=subtopic, difficulty=difficulty, keywords=keywords, used_llm=used_llm)


def apply_updates(db: Session, chunk: Chunk, tag: TagResult) -> bool:
    changed = False
    if chunk.topic != tag.topic:
        chunk.topic = tag.topic
        changed = True
    if chunk.subtopic != tag.subtopic:
        chunk.subtopic = tag.subtopic
        changed = True
    if chunk.difficulty != tag.difficulty:
        chunk.difficulty = tag.difficulty
        changed = True
    if (chunk.keywords or []) != (tag.keywords or []):
        chunk.keywords = tag.keywords
        changed = True

    if changed:
        db.add(chunk)
    return changed


def main() -> int:
    args = parse_args()
    book_id = UUID(args.book_id)
    limit = max(1, int(args.limit))
    batch_size = max(1, int(args.batch_size))
    use_llm = os.getenv("USE_LLM_TAGGING", "false").strip().lower() == "true"
    rules = load_rules()

    stats = {
        "loaded": 0,
        "processed": 0,
        "updated": 0,
        "skipped": 0,
        "llm_used": 0,
    }

    session_factory = get_session_factory()
    pending = 0
    with session_factory() as db:
        try:
            chunks = (
                db.query(Chunk)
                .filter(Chunk.book_id == book_id)
                .order_by(Chunk.page_start.asc(), Chunk.id.asc())
                .limit(limit)
                .all()
            )
            stats["loaded"] = len(chunks)

            for chunk in chunks:
                stats["processed"] += 1
                if not normalize(chunk.text):
                    stats["skipped"] += 1
                    continue

                tagged = tag_chunk(chunk, rules, use_llm=use_llm)
                if tagged.used_llm:
                    stats["llm_used"] += 1

                if apply_updates(db, chunk, tagged):
                    stats["updated"] += 1
                    pending += 1

                if pending >= batch_size:
                    db.commit()
                    pending = 0

            if pending:
                db.commit()
        except Exception:
            db.rollback()
            raise

    print("Chunk Tagging Summary")
    print(f"loaded: {stats['loaded']}")
    print(f"processed: {stats['processed']}")
    print(f"updated: {stats['updated']}")
    print(f"skipped: {stats['skipped']}")
    print(f"llm_used: {stats['llm_used']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
