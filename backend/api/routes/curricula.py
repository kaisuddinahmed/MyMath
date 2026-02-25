"""
backend/api/routes/curricula.py
CRUD endpoints for curriculum and book management.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from backend.knowledge.db import get_db, init_db
from backend.knowledge.models import Curriculum, Book

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Curricula"])


# ---------------------------------------------------------------------------
# Ensure tables exist on startup
# ---------------------------------------------------------------------------

try:
    init_db()
except Exception as exc:
    logger.warning(f"Could not initialize knowledge DB on import: {exc}")


# ---------------------------------------------------------------------------
# Curriculum CRUD
# ---------------------------------------------------------------------------

class _CurriculumCreate:
    """Inline request model to avoid coupling with knowledge layer schemas."""
    pass


from pydantic import BaseModel, Field


class CurriculumCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    board: str = Field(..., min_length=1, max_length=255)
    country: str = Field(..., min_length=1, max_length=120)
    language: str = Field(..., min_length=1, max_length=80)


class BookCreatePayload(BaseModel):
    curriculum_id: str
    class_level: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=255)
    year: Optional[str] = Field(default=None, max_length=32)
    subject: str = Field(default="Math", min_length=1, max_length=120)


class BookUpdatePayload(BaseModel):
    curriculum_id: Optional[str] = None
    class_level: Optional[int] = Field(default=None, ge=1)
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    year: Optional[str] = Field(default=None, max_length=32)
    subject: Optional[str] = Field(default=None, min_length=1, max_length=120)


@router.post("/curricula", status_code=status.HTTP_201_CREATED)
def create_curriculum(payload: CurriculumCreatePayload, db: Session = Depends(get_db)):
    curriculum = Curriculum(
        name=payload.name.strip(),
        board=payload.board.strip(),
        country=payload.country.strip(),
        language=payload.language.strip(),
    )
    db.add(curriculum)
    db.commit()
    db.refresh(curriculum)
    return {
        "id": curriculum.id,
        "name": curriculum.name,
        "board": curriculum.board,
        "country": curriculum.country,
        "language": curriculum.language,
    }


@router.get("/curricula/{curriculum_id}")
def get_curriculum(curriculum_id: str, db: Session = Depends(get_db)):
    curriculum = db.get(Curriculum, curriculum_id)
    if curriculum is None:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return {
        "id": curriculum.id,
        "name": curriculum.name,
        "board": curriculum.board,
        "country": curriculum.country,
        "language": curriculum.language,
    }


@router.get("/curricula")
def list_curricula(db: Session = Depends(get_db)):
    rows = db.query(Curriculum).order_by(Curriculum.name).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "board": c.board,
            "country": c.country,
            "language": c.language,
        }
        for c in rows
    ]


# ---------------------------------------------------------------------------
# Book CRUD
# ---------------------------------------------------------------------------

@router.post("/books", status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreatePayload, db: Session = Depends(get_db)):
    curriculum = db.get(Curriculum, payload.curriculum_id)
    if curriculum is None:
        raise HTTPException(status_code=404, detail="Curriculum not found")

    book = Book(
        curriculum_id=payload.curriculum_id,
        class_level=payload.class_level,
        title=payload.title.strip(),
        year=(payload.year or "").strip(),
        subject=payload.subject.strip(),
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return {
        "id": book.id,
        "curriculum_id": book.curriculum_id,
        "class_level": book.class_level,
        "title": book.title,
        "year": book.year,
        "subject": book.subject,
    }


@router.get("/books/{book_id}")
def get_book(book_id: str, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return {
        "id": book.id,
        "curriculum_id": book.curriculum_id,
        "class_level": book.class_level,
        "title": book.title,
        "year": book.year,
        "subject": book.subject,
    }


@router.get("/books")
def list_books(
    curriculum_id: Optional[str] = None,
    class_level: Optional[int] = Query(default=None, ge=1),
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Book)
    if curriculum_id is not None:
        query = query.filter(Book.curriculum_id == curriculum_id)
    if class_level is not None:
        query = query.filter(Book.class_level == class_level)
    if subject is not None and subject.strip():
        query = query.filter(Book.subject == subject.strip())
    rows = query.order_by(Book.title).all()
    return [
        {
            "id": b.id,
            "curriculum_id": b.curriculum_id,
            "class_level": b.class_level,
            "title": b.title,
            "year": b.year,
            "subject": b.subject,
        }
        for b in rows
    ]


@router.patch("/books/{book_id}")
def update_book(book_id: str, payload: BookUpdatePayload, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")

    changes = payload.model_dump(exclude_unset=True)
    if "curriculum_id" in changes and changes["curriculum_id"] is not None:
        target_curriculum = db.get(Curriculum, changes["curriculum_id"])
        if target_curriculum is None:
            raise HTTPException(status_code=404, detail="Curriculum not found")

    for field, value in changes.items():
        if field == "year" and value is None:
            value = ""
        if value is None:
            continue
        if isinstance(value, str):
            value = value.strip()
        setattr(book, field, value)

    db.add(book)
    db.commit()
    db.refresh(book)
    return {
        "id": book.id,
        "curriculum_id": book.curriculum_id,
        "class_level": book.class_level,
        "title": book.title,
        "year": book.year,
        "subject": book.subject,
    }


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: str, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
