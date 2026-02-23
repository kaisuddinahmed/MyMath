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
3. A **strict JSON video plan** (LLM output, schema-validated)
4. A deterministic **MP4** rendered from templates
5. Practice question(s) via `/try-similar/by-child`

---

## Backend — 5 Isolated Layers

| Layer        | Path                    | Purpose                                                  |
| ------------ | ----------------------- | -------------------------------------------------------- |
| Core         | `backend/core/`         | LLM client, config, prompt validator — no business logic |
| Math Engine  | `backend/math_engine/`  | All math — only layer touched for class upgrades         |
| Knowledge    | `backend/knowledge/`    | Activity log, future Vector DB + RAG                     |
| Video Engine | `backend/video_engine/` | JSON plan → MP4 (unchanged)                              |
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
  video_engine/              # renderer.py + templates (unchanged)
  api/
    app.py
    schemas.py
    routes/                  # children, solve, video, extract, analytics

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
```

```bash
npm run dev:all          # Backend :1233 + Frontend :1234
# OR separately:
uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233
cd frontend && npm run dev
```

---

## API Endpoints

### Core flow

| Method  | Endpoint                           | Description                 |
| ------- | ---------------------------------- | --------------------------- |
| `POST`  | `/children`                        | Create child profile        |
| `GET`   | `/children`                        | List all children           |
| `GET`   | `/children/{child_id}`             | Get child                   |
| `PATCH` | `/children/{child_id}`             | Update child                |
| `POST`  | `/solve-and-video-prompt/by-child` | Solve + LLM video plan      |
| `POST`  | `/render-video`                    | Render MP4                  |
| `POST`  | `/extract-problem`                 | Upload image/PDF → question |
| `POST`  | `/try-similar/by-child`            | Generate practice question  |

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

| Priority | Item                                                            |
| -------- | --------------------------------------------------------------- |
| High     | Class 4 & 5 curriculum profiles + solver expansion              |
| Medium   | Word-problem parser: multi-step problems                        |
| Medium   | Additional video templates (place value, measurement, ordinals) |
| Medium   | Cambridge / Edexcel curriculum profiles                         |
| Lower    | Persist child profiles to DB (models ready, wiring needed)      |
| Lower    | LLM fallback solver (`math_engine/llm_fallback.py`)             |
| Lower    | CI eval gating per class                                        |

---

## License

MIT
