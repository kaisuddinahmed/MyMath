# MyMath — Curriculum-Aware Primary Math Video Explainer

MyMath helps primary students (Grades 1–5) **understand** math through short, visual explanation videos generated per question.

**Core principles:**

- **Correctness first:** answers come from **deterministic solvers** — LLM never touches the final number.
- **Visual learning:** explanations use simple objects and animations (counters, groups, fraction pies).
- **Curriculum-aware, not curriculum-locked:** any question is answered; the child's grade controls _how_, not _whether_.

---

## What MyMath Produces

For each question:

1. **Robust extraction:** Uploads (Image/PDF) are pre-processed (upscaled/sharpened), OCR'd, and automatically corrected via LLM to fix typos and scrambled words.
2. Verified answer + kid-friendly step-by-step explanation
3. A **Director Script JSON** (LLM output, schema-validated) — action-based cues like `ADD_ITEMS`, `GROUP_ITEMS`, `SHOW_EQUATION`
4. **Deepgram Aura TTS** narration audio (~$0.015/1K chars) with a warm teacher-like voice
5. A polished **animated MP4** rendered by **Remotion** (React-based, bouncing SVGs, pie charts, group boxes)
6. **Video cache** — same question + grade = instant playback, $0
7. Practice question(s) via `/try-similar/by-child`

**Estimated cost per new video: ~$0.02. Cached video: $0.**

---

## Backend — 5 Isolated Layers

| Layer        | Path                    | Purpose                                                  |
| ------------ | ----------------------- | -------------------------------------------------------- |
| Core         | `backend/core/`         | LLM client, config, prompt validator — no business logic |
| Math Engine  | `backend/math_engine/`  | All math — only layer touched for class upgrades         |
| Knowledge    | `backend/knowledge/`    | Activity log, future Vector DB + RAG                     |
| Video Engine | `backend/video_engine/` | Director Script → Deepgram TTS → Remotion → cached MP4   |
| API          | `backend/api/`          | HTTP routes + Pydantic schemas only                      |

`backend/main.py` — 17-line thin entrypoint.

---

## Math Engine — Solver Coverage

**15 topic categories, 20/21 solvers ready (95%):**

| Topic             | Operations                                          |
| ----------------- | --------------------------------------------------- |
| Arithmetic        | Add, subtract, multiply, divide (exact + remainder) |
| Fractions         | N/D of whole, add/sub same-denominator              |
| Place value       | Digit value, expanded form                          |
| Comparison        | >, <, between, which is bigger                      |
| Counting          | Skip-count, ordinals                                |
| Patterns          | Arithmetic + geometric sequences                    |
| Measurement       | Length, weight, volume, time unit conversion        |
| Currency          | Add/subtract money, make change (taka, £, $, ₹, €)  |
| Geometry          | Shape facts, perimeter, area (rect/square/triangle) |
| Averages          | Mean                                                |
| Factors/Multiples | Factors, LCM, GCD, is-prime                         |
| Decimals          | Add, subtract, round                                |
| Percentages       | % of N, what %, discount/increase                   |
| Ratio             | Simplify, divide in ratio, unitary method           |
| Data              | Mode, range                                         |

**Fallback cascade:** Arithmetic → topic solvers → word-problem parser → AI-assisted. No question ever crashes.

---

## Repo Layout

```
backend/
  main.py                    # 17-line entrypoint
  core/                      # llm, config, prompt_validator, coverage
  math_engine/
    engine.py                # solve(question, grade) → SolveResult
    topic_detector.py
    grade_style.py
    word_problem_parser.py
    topics/                  # one file per topic (14 files)
    class_profiles/          # class_1–3.json ✅  class_4–5.json 🔲
  knowledge/
    activity.py
    ingestion/               # Offline CLIs (PDF → embeddings)
  video_engine/
    renderer.py              # legacy PIL renderer (fallback)
    tts.py                   # Deepgram Aura TTS
    video_cache.py           # SHA-256 cache (output/cache_index.json)
    templates/
    output/                  # MP4 files + cache_index.json + TTS .wav
  api/
    app.py
    schemas.py
    routes/                  # children, solve, video, extract, analytics

remotion/                    # Remotion animated video renderer
  render-api.js              # Express server (port 1235) — POST /render
  src/
    Root.tsx                 # Remotion entry
    compositions/MathVideo.tsx
    components/Scenes.tsx    # CounterScene, GroupScene, FractionScene, EquationScene
    assets/items/ItemSvgs.tsx # Apple, Block, Star, Counter SVGs

frontend/
  app/                       # page.tsx, parent/, child/, result/
  components/
  lib/                       # api.ts, types.ts, storage.ts
  utils/                     # browser-ocr.ts

docs/architecture.md
```

---

## Run Locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
```

```env
# .env
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DEEPGRAM_API_KEY=your_deepgram_key_here   # Get $200 free at deepgram.com
```

```bash
npm run dev:all   # Backend :1233 + Remotion render server :1235 + Frontend :1234
# OR separately:
uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233
node remotion/render-api.js
cd frontend && npm run dev
```

---

## API Endpoints

### Core flow

| Method  | Endpoint                     | Description                                                   |
| ------- | ---------------------------- | ------------------------------------------------------------- |
| `POST`  | `/children`                  | Create child profile                                          |
| `GET`   | `/children`                  | List all children                                             |
| `GET`   | `/children/{child_id}`       | Get child                                                     |
| `PATCH` | `/children/{child_id}`       | Update child                                                  |
| `POST`  | `/solve-and-render/by-child` | **V2** Solve + TTS + render in one call (returns `video_url`) |
| `POST`  | `/extract-problem`           | Upload image/PDF → question                                   |
| `POST`  | `/try-similar/by-child`      | Generate practice question                                    |

### Legacy (still supported)

| Method | Endpoint                           | Description                 |
| ------ | ---------------------------------- | --------------------------- |
| `POST` | `/solve-and-video-prompt/by-child` | Solve + LLM video plan only |
| `POST` | `/render-video`                    | Render MP4 from JSON plan   |

### Utility

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| `POST` | `/solve`             | Solve only (no LLM)   |
| `GET`  | `/coverage`          | Solver coverage (95%) |
| `GET`  | `/activity`          | Activity log          |
| `GET`  | `/analytics/summary` | Quality metrics       |
| `GET`  | `/analytics/topics`  | Per-topic metrics     |
| `GET`  | `/health`            | Health check          |

---

## Upgrade Workflow

### Add a new topic solver

1. Create `backend/math_engine/topics/<topic>.py`
2. Wire into `backend/math_engine/engine.py`
3. Add keywords to `topic_keywords.json`
4. Update `core/coverage.py` IMPLEMENTED_SOLVERS
5. Add regression cases, run eval

### Upgrade to a new class (e.g. Class 4)

1. Edit `backend/math_engine/class_profiles/class_4.json`
2. Extend topic solvers for new Class 4 topics
3. Add regression cases → run eval → 100% required
4. ✅ API, frontend, video engine, knowledge layer untouched

### Add a curriculum book

1. Run ingestion CLIs on the PDF — zero code changes

---

## NCTB Coverage

| Class   | Status     | Regression |
| ------- | ---------- | ---------- |
| Class 1 | ✅         | 31/31      |
| Class 2 | ✅         | 36/36      |
| Class 3 | ✅         | 32/32      |
| Class 4 | 🔲 planned | —          |
| Class 5 | 🔲 planned | —          |

---

## Remaining Work

| Priority | Item                                                       |
| -------- | ---------------------------------------------------------- |
| High     | Class 4 & 5 curriculum profiles + solver expansion         |
| Medium   | Word-problem parser: multi-step problems                   |
| Medium   | Cambridge / Edexcel curriculum profiles                    |
| Lower    | Persist child profiles to DB (models ready, wiring needed) |
| Lower    | LLM fallback solver (`math_engine/llm_fallback.py`)        |
| Lower    | CI eval gating per class                                   |

---

## License

MIT
