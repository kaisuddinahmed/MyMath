# MyMath — Curriculum-Aware Primary Math Video Explainer

MyMath generates curriculum-aware, grade-adapted animated math explanations for primary learners (Grades 1–5).
It converts typed questions, images, or PDFs into structured problems, verifies the answer, and renders narrated MP4 explanations.

## Why it exists

- Curriculum-aware visuals and narration for early learners
- Deterministic math validation for correctness
- Structured Director Script → Deepgram TTS → Remotion video pipeline
- Video caching for instant replay and low cost

## Key capabilities

- OCR + structured extraction for images/PDFs
- Deterministic solver validation before rendering
- Action-based Director Script JSON for animation
- Deepgram Aura voice narration
- Remotion-powered MP4 rendering
- Practice generation via `/try-similar/by-child`

## Quick start

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
```

Create a `.env` file:

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DEEPGRAM_API_KEY=your_deepgram_key_here
```

Run the project:

```bash
npm run dev:all
```

Or launch services individually:

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233
node remotion/render-api.js
cd frontend && npm run dev
```

## API overview

### Core flow

| Method  | Endpoint                     | Description                                   |
| ------- | ---------------------------- | --------------------------------------------- |
| `POST`  | `/children`                  | Create child profile                          |
| `GET`   | `/children`                  | List child profiles                           |
| `GET`   | `/children/{child_id}`       | Get child profile                             |
| `PATCH` | `/children/{child_id}`       | Update child profile                          |
| `POST`  | `/solve-and-render/by-child` | Solve, render, and return `video_url`         |
| `POST`  | `/extract-problem`           | Upload image/PDF → structured problem output  |
| `POST`  | `/try-similar/by-child`      | Generate practice question                    |

### Utility

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| `POST` | `/solve`             | Solve only            |
| `GET`  | `/coverage`          | Solver coverage       |
| `GET`  | `/activity`          | Activity log          |
| `GET`  | `/health`            | Health check          |

## Project layout

- `backend/` — API, math engine, curriculum profiles, video pipeline
- `remotion/` — React/Remotion animated video renderer
- `frontend/` — user interface and results display
- `docs/architecture.md` — runtime flow, solver design, video narration, extension patterns

## Developer notes

- The backend is layered: `core`, `math_engine`, `knowledge`, `video_engine`, `api`
- `backend/math_engine/engine.py` handles the solver cascade and grade-aware logic
- `backend/api/routes/solve.py` orchestrates cache, solve, render, and narration overrides
- `remotion/` consumes Director Script JSON and produces the final MP4

## See also

- `docs/architecture.md` for full architecture, solver coverage, and technical design details

