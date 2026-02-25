"""
backend/knowledge/models.py
SQLAlchemy ORM models for the curriculum / retrieval / audit layer.

Adapted for SQLite: UUIDs stored as String(36), arrays/dicts stored as JSON.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
    func, text,
)
from sqlalchemy.types import JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Curriculum
# ---------------------------------------------------------------------------

class Curriculum(TimestampMixin, Base):
    __tablename__ = "curricula"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    board: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(120), nullable=False)
    language: Mapped[str] = mapped_column(String(80), nullable=False)

    books: Mapped[List["Book"]] = relationship(
        back_populates="curriculum",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    children: Mapped[List["ChildProfile"]] = relationship(
        back_populates="preferred_curriculum",
    )


# ---------------------------------------------------------------------------
# ChildProfile (DB-backed version)
# ---------------------------------------------------------------------------

class ChildProfile(TimestampMixin, Base):
    __tablename__ = "child_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    child_name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    class_level: Mapped[int] = mapped_column(Integer, nullable=False)
    preferred_curriculum_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("curricula.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    strict_class_level: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("0"),
    )

    preferred_curriculum: Mapped[Optional["Curriculum"]] = relationship(back_populates="children")


# ---------------------------------------------------------------------------
# Book
# ---------------------------------------------------------------------------

class Book(TimestampMixin, Base):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    curriculum_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("curricula.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_level: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    year: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(120), nullable=False)

    curriculum: Mapped["Curriculum"] = relationship(back_populates="books")
    chunks: Mapped[List["Chunk"]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# ---------------------------------------------------------------------------
# Chunk
# ---------------------------------------------------------------------------

class Chunk(TimestampMixin, Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    book_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_level: Mapped[int] = mapped_column(Integer, nullable=False)
    page_start: Mapped[int] = mapped_column(Integer, nullable=False)
    page_end: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    subtopic: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    keywords: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    book: Mapped["Book"] = relationship(back_populates="chunks")
    embeddings: Mapped[List["Embedding"]] = relationship(
        back_populates="chunk",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# ---------------------------------------------------------------------------
# Embedding
# ---------------------------------------------------------------------------

class Embedding(TimestampMixin, Base):
    __tablename__ = "embeddings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    chunk_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("chunks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        unique=True,
    )
    vector: Mapped[List[float]] = mapped_column(JSON, nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, nullable=False, default=dict)

    chunk: Mapped["Chunk"] = relationship(back_populates="embeddings")


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    child_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("child_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    detected_topic: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    curriculum_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("curricula.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    class_level: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retrieved_chunk_ids: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    prompt_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    final_prompt_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    schema_valid: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("0"),
    )
    video_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        index=True,
    )
