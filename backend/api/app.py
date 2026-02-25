"""
backend/api/app.py
FastAPI application factory. Mounts middleware, static files, and all routers.
This is the only place that wires layers together.
"""
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import children, solve, video, extract, analytics, curricula

BASE_DIR = Path(__file__).resolve().parent.parent
VIDEO_OUTPUT_DIR = BASE_DIR / "video_engine" / "output"
VIDEO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def create_app() -> FastAPI:
    app = FastAPI(
        title="MyMath API",
        version="0.2.0",
        description="Curriculum-aware primary math explainer — deterministic solver + LLM video prompts.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Static video files
    app.mount("/videos", StaticFiles(directory=str(VIDEO_OUTPUT_DIR)), name="videos")

    # Routers
    app.include_router(children.router, tags=["Children"])
    app.include_router(solve.router, tags=["Solve"])
    app.include_router(video.router, tags=["Video"])
    app.include_router(extract.router, tags=["Extract"])
    app.include_router(analytics.router, tags=["Analytics"])
    app.include_router(curricula.router)

    @app.get("/health")
    def health():
        return {"status": "ok", "version": "0.2.0"}

    return app
