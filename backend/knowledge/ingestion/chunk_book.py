from __future__ import annotations

import argparse
import json
import re
import uuid
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any


TARGET_WORDS = 500
MAX_WORDS = 800
MIN_WORDS = 80
MIN_HEADER_FOOTER_REPEAT = 3


@dataclass
class PageRow:
    book_id: str
    curriculum_id: str
    class_level: int
    page: int
    text: str


@dataclass
class Segment:
    book_id: str
    curriculum_id: str
    class_level: int
    page_start: int
    page_end: int
    words: list[str]


@dataclass
class ChunkAccumulator:
    book_id: str
    curriculum_id: str
    class_level: int
    page_start: int
    page_end: int
    words: list[str]

    @property
    def word_count(self) -> int:
        return len(self.words)


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def word_count(text: str) -> int:
    return len(normalize_whitespace(text).split())


def split_words_for_chunking(text: str, target_words: int = TARGET_WORDS, max_words: int = MAX_WORDS) -> list[list[str]]:
    words = normalize_whitespace(text).split()
    if not words:
        return []

    chunks: list[list[str]] = []
    i = 0
    while i < len(words):
        remaining = len(words) - i
        if remaining <= max_words:
            end = len(words)
        else:
            end = min(len(words), i + target_words)
            limit = min(len(words), i + max_words)
            # Extend to sentence punctuation if found before max_words.
            for j in range(end, limit + 1):
                if words[j - 1].endswith((".", "?", "!", ";", ":")):
                    end = j
                    break
        chunks.append(words[i:end])
        i = end
    return chunks


def parse_line_to_page(row: dict[str, Any], line_no: int) -> PageRow:
    missing = [k for k in ("book_id", "curriculum_id", "class_level", "page", "text") if k not in row]
    if missing:
        raise ValueError(f"Line {line_no}: missing fields: {', '.join(missing)}")

    text = str(row.get("text", ""))
    return PageRow(
        book_id=str(row["book_id"]),
        curriculum_id=str(row["curriculum_id"]),
        class_level=int(row["class_level"]),
        page=int(row["page"]),
        text=text,
    )


def read_pages_jsonl(path: Path) -> list[PageRow]:
    pages: list[PageRow] = []
    with path.open("r", encoding="utf-8") as f:
        for line_no, raw in enumerate(f, start=1):
            raw = raw.strip()
            if not raw:
                continue
            try:
                row = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Line {line_no}: invalid JSON: {exc.msg}") from exc
            pages.append(parse_line_to_page(row, line_no))
    return pages


def _line_candidates(text: str) -> list[str]:
    lines = [normalize_whitespace(line) for line in text.splitlines()]
    lines = [line for line in lines if line]
    if not lines:
        collapsed = normalize_whitespace(text)
        if collapsed:
            lines = [collapsed]
    return lines


def detect_repeated_header_footer(pages: list[PageRow]) -> tuple[set[str], set[str]]:
    if len(pages) < MIN_HEADER_FOOTER_REPEAT:
        return set(), set()

    header_counter: Counter[str] = Counter()
    footer_counter: Counter[str] = Counter()

    for page in pages:
        lines = _line_candidates(page.text)
        if not lines:
            continue

        head = lines[0]
        tail = lines[-1]
        # Keep only short candidates to avoid stripping real content.
        if len(head.split()) <= 12:
            header_counter[head] += 1
        if len(tail.split()) <= 12:
            footer_counter[tail] += 1

    repeated_headers = {k for k, c in header_counter.items() if c >= MIN_HEADER_FOOTER_REPEAT}
    repeated_footers = {k for k, c in footer_counter.items() if c >= MIN_HEADER_FOOTER_REPEAT}
    return repeated_headers, repeated_footers


def strip_repeated_header_footer(text: str, repeated_headers: set[str], repeated_footers: set[str]) -> str:
    lines = _line_candidates(text)
    if not lines:
        return ""

    if lines and lines[0] in repeated_headers:
        lines = lines[1:]
    if lines and lines[-1] in repeated_footers:
        lines = lines[:-1]
    return normalize_whitespace(" ".join(lines))


def build_segments(pages: list[PageRow]) -> list[Segment]:
    repeated_headers, repeated_footers = detect_repeated_header_footer(pages)
    segments: list[Segment] = []

    for page in pages:
        cleaned = strip_repeated_header_footer(page.text, repeated_headers, repeated_footers)
        if not cleaned:
            continue

        splits = split_words_for_chunking(cleaned)
        for words in splits:
            if not words:
                continue
            segments.append(
                Segment(
                    book_id=page.book_id,
                    curriculum_id=page.curriculum_id,
                    class_level=page.class_level,
                    page_start=page.page,
                    page_end=page.page,
                    words=words,
                )
            )
    return segments


def _compatible(a: ChunkAccumulator, b: Segment) -> bool:
    return (
        a.book_id == b.book_id
        and a.curriculum_id == b.curriculum_id
        and a.class_level == b.class_level
        and b.page_start <= a.page_end + 1
    )


def build_chunks(segments: list[Segment]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    current: ChunkAccumulator | None = None

    def flush() -> None:
        nonlocal current
        if current is None:
            return
        if current.word_count >= MIN_WORDS:
            out.append(
                {
                    "chunk_id": str(uuid.uuid4()),
                    "book_id": current.book_id,
                    "curriculum_id": current.curriculum_id,
                    "class_level": current.class_level,
                    "page_start": current.page_start,
                    "page_end": current.page_end,
                    "text": " ".join(current.words),
                }
            )
        current = None

    for seg in segments:
        if current is None:
            current = ChunkAccumulator(
                book_id=seg.book_id,
                curriculum_id=seg.curriculum_id,
                class_level=seg.class_level,
                page_start=seg.page_start,
                page_end=seg.page_end,
                words=list(seg.words),
            )
            continue

        if not _compatible(current, seg):
            flush()
            current = ChunkAccumulator(
                book_id=seg.book_id,
                curriculum_id=seg.curriculum_id,
                class_level=seg.class_level,
                page_start=seg.page_start,
                page_end=seg.page_end,
                words=list(seg.words),
            )
            continue

        seg_words = len(seg.words)
        if current.word_count >= 300 and current.word_count + seg_words > MAX_WORDS:
            flush()
            current = ChunkAccumulator(
                book_id=seg.book_id,
                curriculum_id=seg.curriculum_id,
                class_level=seg.class_level,
                page_start=seg.page_start,
                page_end=seg.page_end,
                words=list(seg.words),
            )
            continue

        current.words.extend(seg.words)
        current.page_end = max(current.page_end, seg.page_end)

        # Keep chunks around the target size while allowing small-page merges.
        if current.word_count >= TARGET_WORDS:
            flush()

    flush()
    return out


def write_jsonl(rows: list[dict[str, Any]], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert raw PDF pages JSONL into retrieval chunks.",
    )
    parser.add_argument("--in", dest="in_path", required=True, help="Input raw_pages.jsonl path")
    parser.add_argument("--out", required=True, help="Output chunks.jsonl path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    in_path = Path(args.in_path).expanduser().resolve()
    if not in_path.exists() or not in_path.is_file():
        raise SystemExit(f"Input JSONL not found: {in_path}")

    out_path = Path(args.out).expanduser().resolve()
    pages = read_pages_jsonl(in_path)
    if not pages:
        write_jsonl([], out_path)
        print(f"No pages found in {in_path}. Wrote 0 chunks.")
        return 0

    pages.sort(key=lambda r: (r.book_id, r.page))
    segments = build_segments(pages)
    chunks = build_chunks(segments)
    write_jsonl(chunks, out_path)
    print(f"Wrote {len(chunks)} chunks to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
