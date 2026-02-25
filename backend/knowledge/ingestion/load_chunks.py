from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from backend.knowledge.db import get_session_factory
from backend.knowledge.models import Book, Chunk

BATCH_SIZE = 100


@dataclass
class ChunkRow:
    chunk_id: UUID
    book_id: UUID
    curriculum_id: str
    class_level: int
    page_start: int
    page_end: int
    text: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load chunk JSONL rows into the database.")
    parser.add_argument("--in", dest="in_path", required=True, help="Input chunks.jsonl path")
    parser.add_argument("--batch_size", type=int, default=BATCH_SIZE, help="Commit batch size (default: 100)")
    return parser.parse_args()


def _require_fields(row: dict[str, Any], line_no: int) -> None:
    required = ("chunk_id", "book_id", "curriculum_id", "class_level", "page_start", "page_end", "text")
    missing = [k for k in required if k not in row]
    if missing:
        raise ValueError(f"Line {line_no}: missing fields: {', '.join(missing)}")


def parse_chunk_row(row: dict[str, Any], line_no: int) -> ChunkRow:
    _require_fields(row, line_no)
    try:
        chunk_id = UUID(str(row["chunk_id"]))
        book_id = UUID(str(row["book_id"]))
        class_level = int(row["class_level"])
        page_start = int(row["page_start"])
        page_end = int(row["page_end"])
    except ValueError as exc:
        raise ValueError(f"Line {line_no}: invalid UUID/int value") from exc

    text = " ".join(str(row.get("text", "")).split()).strip()
    return ChunkRow(
        chunk_id=chunk_id,
        book_id=book_id,
        curriculum_id=str(row["curriculum_id"]),
        class_level=class_level,
        page_start=page_start,
        page_end=page_end,
        text=text,
    )


def upsert_chunk(db: Session, row: ChunkRow) -> str:
    existing = db.get(Chunk, row.chunk_id)
    if existing is None:
        db.add(
            Chunk(
                id=row.chunk_id,
                book_id=row.book_id,
                class_level=row.class_level,
                page_start=row.page_start,
                page_end=row.page_end,
                text=row.text,
            )
        )
        return "inserted"

    existing.book_id = row.book_id
    existing.class_level = row.class_level
    existing.page_start = row.page_start
    existing.page_end = row.page_end
    existing.text = row.text
    db.add(existing)
    return "updated"


def ensure_book_exists(db: Session, book_id: UUID, cache: dict[UUID, bool], line_no: int) -> None:
    if book_id in cache:
        if not cache[book_id]:
            raise RuntimeError(f"Line {line_no}: book_id {book_id} does not exist in books table.")
        return

    exists = db.get(Book, book_id) is not None
    cache[book_id] = exists
    if not exists:
        raise RuntimeError(f"Line {line_no}: book_id {book_id} does not exist in books table.")


def process_file(in_path: Path, batch_size: int = BATCH_SIZE) -> dict[str, int]:
    stats = {"total_processed": 0, "inserted": 0, "updated": 0, "skipped": 0}
    pending = 0
    book_cache: dict[UUID, bool] = {}

    session_factory = get_session_factory()
    with session_factory() as db:
        try:
            with in_path.open("r", encoding="utf-8") as f:
                for line_no, raw in enumerate(f, start=1):
                    raw = raw.strip()
                    if not raw:
                        continue

                    try:
                        obj = json.loads(raw)
                    except json.JSONDecodeError:
                        stats["skipped"] += 1
                        continue

                    try:
                        row = parse_chunk_row(obj, line_no)
                    except ValueError:
                        stats["skipped"] += 1
                        continue

                    if not row.text:
                        stats["skipped"] += 1
                        continue

                    if row.page_start > row.page_end:
                        stats["skipped"] += 1
                        continue

                    ensure_book_exists(db, row.book_id, book_cache, line_no)

                    result = upsert_chunk(db, row)
                    stats["total_processed"] += 1
                    stats[result] += 1
                    pending += 1

                    if pending >= batch_size:
                        db.commit()
                        pending = 0

            if pending:
                db.commit()
        except Exception:
            db.rollback()
            raise

    return stats


def main() -> int:
    args = parse_args()
    batch_size = max(1, int(args.batch_size))
    in_path = Path(args.in_path).expanduser().resolve()
    if not in_path.exists() or not in_path.is_file():
        raise SystemExit(f"Input JSONL not found: {in_path}")

    stats = process_file(in_path, batch_size=batch_size)
    print("Chunk Load Summary")
    print(f"total_processed: {stats['total_processed']}")
    print(f"inserted: {stats['inserted']}")
    print(f"updated: {stats['updated']}")
    print(f"skipped: {stats['skipped']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
