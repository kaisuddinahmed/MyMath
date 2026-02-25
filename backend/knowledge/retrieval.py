"""
backend/knowledge/retrieval.py
Vector retrieval for curriculum-specific textbook chunks using ChromaDB.

Provides `retrieve_chunks(question, curriculum_id, class_level)` which queries
the vector store with strict curriculum/class filters and graceful fallbacks.
"""
from __future__ import annotations

import os
import threading
from collections import OrderedDict
from typing import Any, Dict, List, Optional

from backend.knowledge.ingestion.embed_chunks import get_chroma_collection, get_embedder, with_retry

_CACHE_MAX = 256
_CACHE: "OrderedDict[tuple[Any, ...], List[Dict[str, Any]]]" = OrderedDict()
_CACHE_LOCK = threading.Lock()


def _cache_key(
    question: str,
    curriculum_id: Optional[str],
    class_level: Optional[int],
    top_k: int,
    strict_class_level: bool,
) -> tuple[Any, ...]:
    return (
        question.strip().lower(),
        curriculum_id or "",
        int(class_level) if class_level is not None else None,
        int(top_k),
        bool(strict_class_level),
        os.getenv("EMBEDDING_PROVIDER", "local").strip().lower(),
        os.getenv("EMBEDDING_MODEL", "").strip(),
        os.getenv("EMBEDDING_DIM", "768").strip(),
        os.getenv("CHROMA_PATH", "backend/data/chroma").strip(),
        os.getenv("VECTOR_COLLECTION", "mymath_chunks").strip(),
    )


def _cache_get(key: tuple[Any, ...]) -> Optional[List[Dict[str, Any]]]:
    with _CACHE_LOCK:
        if key not in _CACHE:
            return None
        _CACHE.move_to_end(key)
        return [dict(x) for x in _CACHE[key]]


def _cache_set(key: tuple[Any, ...], value: List[Dict[str, Any]]) -> None:
    with _CACHE_LOCK:
        _CACHE[key] = [dict(x) for x in value]
        _CACHE.move_to_end(key)
        while len(_CACHE) > _CACHE_MAX:
            _CACHE.popitem(last=False)


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _score_from_distance(distance: Any) -> float:
    try:
        d = float(distance)
    except (TypeError, ValueError):
        return 0.0
    return 1.0 / (1.0 + max(0.0, d))


def _query_chroma(question_vector: List[float], where: Optional[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
    collection = get_chroma_collection()
    kwargs: Dict[str, Any] = {
        "query_embeddings": [question_vector],
        "n_results": max(1, int(top_k)),
    }
    if where:
        kwargs["where"] = where
    res = collection.query(**kwargs)

    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]

    out: List[Dict[str, Any]] = []
    for idx, cid in enumerate(ids):
        md = metas[idx] if idx < len(metas) and isinstance(metas[idx], dict) else {}
        text = docs[idx] if idx < len(docs) else ""
        dist = dists[idx] if idx < len(dists) else None
        raw_keywords = str(md.get("keywords_csv", "") or "")
        keywords = [x.strip() for x in raw_keywords.split(",") if x and x.strip()]
        out.append(
            {
                "chunk_id": str(md.get("chunk_id", cid)),
                "book_id": str(md.get("book_id", "")),
                "curriculum_id": str(md.get("curriculum_id", "")),
                "class_level": _to_int(md.get("class_level"), 0),
                "topic": str(md.get("topic", "")) or None,
                "subtopic": str(md.get("subtopic", "")) or None,
                "page_start": _to_int(md.get("page_start"), 0),
                "page_end": _to_int(md.get("page_end"), 0),
                "keywords": keywords,
                "text": str(text or ""),
                "score": _score_from_distance(dist),
            }
        )
    return out


def _build_where(curriculum_id: Optional[str], class_level: Optional[int]) -> Optional[Dict[str, Any]]:
    clauses: List[Dict[str, Any]] = []
    if curriculum_id:
        clauses.append({"curriculum_id": curriculum_id})
    if class_level is not None:
        clauses.append({"class_level": int(class_level)})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def _dedupe_best(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    by_id: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        cid = str(row.get("chunk_id", ""))
        if not cid:
            continue
        prev = by_id.get(cid)
        if prev is None or float(row.get("score", 0.0)) > float(prev.get("score", 0.0)):
            by_id[cid] = row
    return sorted(by_id.values(), key=lambda x: float(x.get("score", 0.0)), reverse=True)


def _fallback_queries(
    question_vector: List[float],
    curriculum_id: Optional[str],
    class_level: Optional[int],
    top_k: int,
    strict_class_level: bool = False,
) -> List[Dict[str, Any]]:
    level = int(class_level) if class_level is not None else None
    strict_where = _build_where(curriculum_id, level)

    # 1) Strict filters
    rows = _query_chroma(question_vector, strict_where, top_k)
    if rows:
        return rows[:top_k]

    # In strict mode, keep class level exact if provided.
    if strict_class_level and level is not None:
        if curriculum_id:
            rows = _query_chroma(question_vector, _build_where(None, level), top_k)
            if rows:
                return rows[:top_k]
        return []

    # 2) Relax class level to +/-1 (still keeping curriculum if present)
    if level is not None:
        alt_levels = [lvl for lvl in [level - 1, level + 1] if lvl >= 1]
        relaxed_rows: List[Dict[str, Any]] = []
        for lvl in alt_levels:
            where = _build_where(curriculum_id, lvl)
            relaxed_rows.extend(_query_chroma(question_vector, where, top_k))
        relaxed_rows = _dedupe_best(relaxed_rows)
        if relaxed_rows:
            return relaxed_rows[:top_k]

    # 3) Remove curriculum filter
    if curriculum_id:
        if level is not None:
            rows = _query_chroma(question_vector, _build_where(None, level), top_k)
            if rows:
                return rows[:top_k]
            alt_levels = [lvl for lvl in [level - 1, level + 1] if lvl >= 1]
            rows2: List[Dict[str, Any]] = []
            for lvl in alt_levels:
                rows2.extend(_query_chroma(question_vector, _build_where(None, lvl), top_k))
            rows2 = _dedupe_best(rows2)
            if rows2:
                return rows2[:top_k]
        else:
            rows = _query_chroma(question_vector, None, top_k)
            if rows:
                return rows[:top_k]

    # Final fallback: no filters.
    return _query_chroma(question_vector, None, top_k)[:top_k]


def retrieve_chunks(
    question: str,
    curriculum_id: Optional[str],
    class_level: Optional[int],
    top_k: int = 5,
    strict_class_level: bool = False,
) -> List[Dict[str, Any]]:
    """
    Main retrieval function. Queries the vector database for curriculum-specific
    textbook chunks relevant to the given question.

    Filters by curriculum_id and class_level to guarantee curriculum isolation.
    Falls back gracefully if strict filters return no results.
    """
    q = (question or "").strip()
    if not q:
        return []

    top_k = max(1, int(top_k))
    key = _cache_key(q, curriculum_id, class_level, top_k, strict_class_level)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    embed = get_embedder()
    qvec = with_retry(lambda: embed(q))
    rows = _fallback_queries(qvec, curriculum_id, class_level, top_k, strict_class_level)
    rows = sorted(rows, key=lambda x: float(x.get("score", 0.0)), reverse=True)[:top_k]
    _cache_set(key, rows)
    return rows
