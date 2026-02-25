"""
backend/knowledge/ingestion/ingest_book.py
CLI: Extract a textbook PDF page-by-page and write JSONL for chunking.

Usage:
    python -m backend.knowledge.ingestion.ingest_book \
        --pdf backend/data/books/NCTB_Class_3.pdf \
        --book_id <uuid> --curriculum_id <uuid> --class_level 3 \
        --out backend/knowledge/ingestion/raw_pages.jsonl
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from uuid import UUID


def _parse_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Invalid UUID: {value}") from exc


def _is_obvious_page_number(line: str, page_number: int) -> bool:
    text = line.strip().lower()
    if not text:
        return False
    page = str(page_number)
    if text == page:
        return True
    if re.fullmatch(rf"[-–—]*\s*{page}\s*[-–—]*", text):
        return True
    if re.fullmatch(rf"(page|pg|p\.?)\s*{page}", text):
        return True
    if re.fullmatch(rf"{page}\s*/\s*\d{{1,4}}", text):
        return True
    return False


def clean_page_text(raw_text: str, page_number: int) -> str:
    lines = raw_text.splitlines()
    kept_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if _is_obvious_page_number(stripped, page_number):
            continue
        kept_lines.append(stripped)
    if not kept_lines:
        return ""
    text = " ".join(kept_lines)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_page_texts(pdf_path: Path) -> list[tuple[int, str]]:
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required. Install: pip install pymupdf") from exc

    pages: list[tuple[int, str]] = []
    with fitz.open(pdf_path) as doc:
        for idx, page in enumerate(doc, start=1):
            raw = page.get_text("text") or ""
            cleaned = clean_page_text(raw, idx)
            if not cleaned:
                continue
            pages.append((idx, cleaned))
    return pages


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract a textbook PDF page-by-page and write JSONL for chunking.",
    )
    parser.add_argument("--pdf", required=True, help="Path to source PDF file")
    parser.add_argument("--book_id", required=True, type=_parse_uuid, help="Book UUID")
    parser.add_argument("--class_level", required=True, type=int, help="Class level (e.g., 1-5)")
    parser.add_argument("--curriculum_id", required=True, type=_parse_uuid, help="Curriculum UUID")
    parser.add_argument("--out", required=True, help="Output JSONL path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.class_level < 1:
        raise SystemExit("--class_level must be >= 1")

    pdf_path = Path(args.pdf).expanduser().resolve()
    if not pdf_path.exists() or not pdf_path.is_file():
        raise SystemExit(f"PDF file not found: {pdf_path}")

    out_path = Path(args.out).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    pages = extract_page_texts(pdf_path)
    written = 0
    with out_path.open("w", encoding="utf-8") as f:
        for page_number, text in pages:
            row = {
                "book_id": str(args.book_id),
                "curriculum_id": str(args.curriculum_id),
                "class_level": int(args.class_level),
                "page": int(page_number),
                "text": text,
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            written += 1

    print(f"Wrote {written} JSONL rows to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
