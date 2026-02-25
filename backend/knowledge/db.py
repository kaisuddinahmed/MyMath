"""
backend/knowledge/db.py
SQLite database session factory for the knowledge layer.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend.knowledge.models import Base

_BASE_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_DB_PATH = _BASE_DIR / "data" / "mymath.sqlite3"

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_database_url() -> str:
    env_url = os.getenv("DATABASE_URL", "").strip()
    if env_url:
        return env_url
    db_path = _DEFAULT_DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{db_path}"


def get_engine() -> Engine:
    global _engine, _session_factory
    if _engine is None:
        url = get_database_url()
        connect_args = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        _engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
        _session_factory = sessionmaker(
            bind=_engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=Session,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        get_engine()
    assert _session_factory is not None
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def init_db() -> None:
    engine = get_engine()
    Base.metadata.create_all(bind=engine)


def close_db() -> None:
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None
