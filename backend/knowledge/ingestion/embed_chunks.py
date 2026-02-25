from __future__ import annotations

import argparse
import hashlib
import math
import os
import time
from typing import Any, Callable
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from backend.knowledge.db import get_session_factory
from backend.knowledge.models import Chunk, Embedding

DEFAULT_LIMIT = 500
DEFAULT_BATCH_SIZE = 50
DEFAULT_PROVIDER = "local"
DEFAULT_LOCAL_DIM = 768
DEFAULT_COLLECTION = "mymath_chunks"
DEFAULT_CHROMA_PATH = "backend/data/chroma"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate embeddings for chunks and upsert to vector DB.")
    parser.add_argument("--book_id", required=True, help="Book UUID")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="Max chunks to process (default: 500)")
    parser.add_argument("--batch_size", type=int, default=DEFAULT_BATCH_SIZE, help="Commit batch size (default: 50)")
    return parser.parse_args()


def normalize(text: str) -> str:
    return " ".join((text or "").split()).strip()


def tokens(text: str) -> list[str]:
    out: list[str] = []
    word = []
    for ch in text.lower():
        if ch.isalnum() or ch in {"-", "_"}:
            word.append(ch)
        else:
            if word:
                out.append("".join(word))
                word = []
    if word:
        out.append("".join(word))
    return out


def local_embedding(text: str, dim: int) -> list[float]:
    vec = [0.0] * dim
    toks = tokens(text)
    if not toks:
        return vec

    for tok in toks:
        h = hashlib.blake2b(tok.encode("utf-8"), digest_size=8).digest()
        idx = int.from_bytes(h, byteorder="big") % dim
        vec[idx] += 1.0

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def get_embedder() -> Callable[[str], list[float]]:
    provider = os.getenv("EMBEDDING_PROVIDER", DEFAULT_PROVIDER).strip().lower()
    model = os.getenv("EMBEDDING_MODEL", "").strip()

    if provider == "local":
        dim = int(os.getenv("EMBEDDING_DIM", str(DEFAULT_LOCAL_DIM)))
        if dim <= 0:
            raise RuntimeError("EMBEDDING_DIM must be > 0")
        return lambda text: local_embedding(text, dim)

    if provider == "openai":
        from openai import OpenAI

        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai")
        if not model:
            raise RuntimeError("EMBEDDING_MODEL is required when EMBEDDING_PROVIDER=openai")
        client = OpenAI(api_key=api_key)

        def _embed(text: str) -> list[float]:
            resp = client.embeddings.create(model=model, input=text)
            return list(resp.data[0].embedding)

        return _embed

    if provider == "groq":
        from groq import Groq

        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is required when EMBEDDING_PROVIDER=groq")
        if not model:
            raise RuntimeError("EMBEDDING_MODEL is required when EMBEDDING_PROVIDER=groq")
        client = Groq(api_key=api_key)

        def _embed(text: str) -> list[float]:
            # Groq embedding support depends on account/model availability.
            resp = client.embeddings.create(model=model, input=text)
            return list(resp.data[0].embedding)

        return _embed

    raise RuntimeError(f"Unsupported EMBEDDING_PROVIDER: {provider}")


def should_retry(exc: Exception) -> bool:
    name = exc.__class__.__name__.lower()
    msg = str(exc).lower()
    transient_tokens = [
        "timeout",
        "temporarily",
        "rate limit",
        "connection",
        "503",
        "502",
        "429",
    ]
    return any(t in name or t in msg for t in transient_tokens)


def with_retry(fn: Callable[[], Any], retries: int = 3, base_sleep: float = 0.8) -> Any:
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
            if attempt >= retries or not should_retry(exc):
                raise
            time.sleep(base_sleep * (2 ** (attempt - 1)))
    assert last_exc is not None
    raise last_exc


def get_chroma_collection():
    import chromadb

    path = os.getenv("CHROMA_PATH", DEFAULT_CHROMA_PATH)
    name = os.getenv("VECTOR_COLLECTION", DEFAULT_COLLECTION)
    client = chromadb.PersistentClient(path=path)
    return client.get_or_create_collection(name=name, metadata={"hnsw:space": "cosine"})


def build_metadata(chunk: Chunk) -> dict[str, Any]:
    return {
        "chunk_id": str(chunk.id),
        "book_id": str(chunk.book_id),
        "curriculum_id": str(chunk.book.curriculum_id) if chunk.book else "",
        "class_level": int(chunk.class_level),
        "topic": chunk.topic or "",
        "subtopic": chunk.subtopic or "",
        "page_start": int(chunk.page_start),
        "page_end": int(chunk.page_end),
        "keywords": chunk.keywords or [],
    }


def upsert_embedding_row(db: Session, chunk: Chunk, vector: list[float], metadata: dict[str, Any]) -> None:
    existing = db.query(Embedding).filter(Embedding.chunk_id == chunk.id).one_or_none()
    if existing is None:
        existing = Embedding(
            id=uuid4(),
            chunk_id=chunk.id,
            vector=vector,
            metadata_json=metadata,
        )
    else:
        existing.vector = vector
        existing.metadata_json = metadata
    db.add(existing)


def flush_batch(db: Session, collection, batch_payload: list[tuple[Chunk, list[float], dict[str, Any]]]) -> None:
    if not batch_payload:
        return

    ids = [str(chunk.id) for chunk, _, _ in batch_payload]
    docs = [chunk.text for chunk, _, _ in batch_payload]
    embeds = [vec for _, vec, _ in batch_payload]
    metas = []
    for _, _, md in batch_payload:
        metas.append(
            {
                "chunk_id": md["chunk_id"],
                "book_id": md["book_id"],
                "curriculum_id": md["curriculum_id"],
                "class_level": md["class_level"],
                "topic": md["topic"],
                "subtopic": md["subtopic"],
                "page_start": md["page_start"],
                "page_end": md["page_end"],
                "keywords_csv": ",".join(md.get("keywords", [])),
            }
        )

    def _upsert_chroma():
        collection.upsert(ids=ids, embeddings=embeds, documents=docs, metadatas=metas)

    with_retry(_upsert_chroma)
    for chunk, vec, md in batch_payload:
        upsert_embedding_row(db, chunk, vec, md)
    db.commit()


def main() -> int:
    args = parse_args()
    book_id = UUID(args.book_id)
    limit = max(1, int(args.limit))
    batch_size = max(1, int(args.batch_size))

    embed = get_embedder()
    collection = get_chroma_collection()
    session_factory = get_session_factory()

    stats = {"processed": 0, "embedded": 0, "skipped": 0, "failed": 0}

    with session_factory() as db:
        chunks = (
            db.query(Chunk)
            .filter(Chunk.book_id == book_id)
            .order_by(Chunk.page_start.asc(), Chunk.id.asc())
            .limit(limit)
            .all()
        )

        batch_payload: list[tuple[Chunk, list[float], dict[str, Any]]] = []
        total = len(chunks)
        for idx, chunk in enumerate(chunks, start=1):
            stats["processed"] += 1

            if db.query(Embedding).filter(Embedding.chunk_id == chunk.id).first() is not None:
                stats["skipped"] += 1
                if idx % 25 == 0 or idx == total:
                    print(f"[{idx}/{total}] processed={stats['processed']} embedded={stats['embedded']} skipped={stats['skipped']} failed={stats['failed']}")
                continue

            text = normalize(chunk.text)
            if not text:
                stats["skipped"] += 1
                continue

            try:
                vec = with_retry(lambda: embed(text))
                md = build_metadata(chunk)
                batch_payload.append((chunk, vec, md))
                stats["embedded"] += 1
            except Exception as exc:
                stats["failed"] += 1
                print(f"Failed chunk {chunk.id}: {exc}")

            if len(batch_payload) >= batch_size:
                try:
                    flush_batch(db, collection, batch_payload)
                    print(f"[{idx}/{total}] committed batch of {len(batch_payload)}")
                    batch_payload = []
                except Exception:
                    db.rollback()
                    raise

            if idx % 25 == 0 or idx == total:
                print(f"[{idx}/{total}] processed={stats['processed']} embedded={stats['embedded']} skipped={stats['skipped']} failed={stats['failed']}")

        if batch_payload:
            try:
                flush_batch(db, collection, batch_payload)
                print(f"[final] committed batch of {len(batch_payload)}")
            except Exception:
                db.rollback()
                raise

    print("Embedding Summary")
    print(f"processed: {stats['processed']}")
    print(f"embedded: {stats['embedded']}")
    print(f"skipped: {stats['skipped']}")
    print(f"failed: {stats['failed']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
