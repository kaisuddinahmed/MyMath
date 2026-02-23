# MyMath — Architecture

## Goal

Generate curriculum-aware, age-appropriate **visual math explanations (MP4)** for primary learners (Grades 1–5), while guaranteeing **math correctness** via deterministic solvers.

---

## Runtime Flow (Question → Video)

```
Child question
      │
      ▼
[API Layer]  backend/api/routes/solve.py
      │  Receives request, calls math engine
      │
      ▼
[Math Engine]  backend/math_engine/engine.solve()
      │  Cascading solver pipeline (see below)
      │
      ▼
[Knowledge Layer]  backend/knowledge/retrieval.py  (opt-in)
      │  curriculum_hints from Vector DB
      │
      ▼
[LLM — Groq]  backend/core/llm.py
      │  Strict JSON video plan (up to 2 attempts)
      │
      ▼
[Prompt Validator]  backend/core/prompt_validator.py
      │  Schema + hard topic checks + score (0–100)
      │
      ▼
[Video Engine]  backend/video_engine/renderer.py
      │  JSON plan → frames → TTS → MP4
      │
      ▼
      MP4 served via /videos static mount
```

---

## The 5 Layers

### Layer 1 — `backend/core/` — Shared Infrastructure

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `llm.py`              | Groq client                                  |
| `config.py`           | Loads topic_map, grade_style, topic_keywords |
| `prompt_validator.py` | Schema validation + hard checks + scoring    |
| `coverage.py`         | `coverage_report()` — 20/21 topics ready     |

**Rule:** No business logic.

---

### Layer 2 — `backend/math_engine/` — Math Logic ← only layer touched for class upgrades

```
math_engine/
  engine.py               # solve(question, grade) → SolveResult
  topic_detector.py       # scored classifier
  grade_style.py          # grade → vocab/pace/objects
  word_problem_parser.py  # sentence → numbers + operation
  topics/
    arithmetic.py         # add, subtract, multiply, divide ✅
    fractions.py          # N/D of whole, add/sub fractions ✅
    place_value.py        # digit value, expanded form ✅
    comparison.py         # >, <, between, which is bigger ✅
    counting.py           # skip-count, ordinals ✅
    patterns.py           # arithmetic + geometric sequences ✅
    measurement.py        # length/weight/volume/time conversion ✅
    currency.py           # add/subtract money, change ✅
    geometry.py           # shape facts, perimeter, area ✅
    averages.py           # mean ✅
    factors_multiples.py  # factors, LCM, GCD, is-prime ✅
    decimals.py           # add, subtract, round ✅
    percentages.py        # % of N, what %, discount ✅
    ratio.py              # simplify, divide in ratio, unitary ✅
    data.py               # mode, range ✅
  class_profiles/
    class_1.json  ✅  class_2.json  ✅  class_3.json  ✅
    class_4.json  🔲  class_5.json  🔲
```

**Solver cascade (engine.py):**

```
Arithmetic regex (highest confidence)
  → fractions, factors, percentages, decimals, ratio, averages
  → measurement, geometry, data, currency, patterns, place_value
  → comparison, counting  (broadest patterns — run last)
  → word_problem_parser   (sentence fallback)
  → AI-assisted           (returns topic + signals LLM)
```

**Public interface (never breaks other layers):**

```python
def solve(question: str, grade: int, curriculum_hints: list[str] = []) -> SolveResult
```

---

### Layer 3 — `backend/knowledge/` — Curriculum & Data

**Adding a book only touches this layer.**

```
knowledge/
  activity.py    # bounded activity log (300 records, file-based)
  retrieval.py   # retrieve_hints(question, curriculum_id, class_level)
  db.py / models.py  # ORM — ChildProfile, Book, Chunk, Embedding, AuditLog
  ingestion/     # offline CLIs only
    ingest_book.py → chunk_book.py → load_chunks.py → tag_chunks.py → embed_chunks.py
```

---

### Layer 4 — `backend/video_engine/` — Video Renderer (unchanged)

```
video_engine/
  renderer.py         # render_video(plan_json, output) → MP4
  templates/          # counters.py, groups.py, fraction.py
  output/             # served as /videos
```

---

### Layer 5 — `backend/api/` — HTTP Interface

```
api/
  app.py        # FastAPI factory — middleware + router wiring
  schemas.py    # all Pydantic models
  routes/
    children.py   GET/POST/PATCH /children
    solve.py      /solve, /solve-and-video-prompt, /by-child, /try-similar/by-child
    video.py      /render-video
    extract.py    /extract-problem  (Upload → Pre-process → OCR → LLM Repair → Pick Question)
    analytics.py  /activity, /coverage, /analytics/*
```

---

## Data Model

| Model                                      | Status                       |
| ------------------------------------------ | ---------------------------- |
| `ChildProfile`                             | ✅ in-memory; DB model ready |
| `Curriculum`, `Book`, `Chunk`, `Embedding` | ✅ DB models built           |
| `AuditLog`                                 | ✅ DB model built            |

---

## NCTB Curriculum Profiles

| Class   | Status     | Regression |
| ------- | ---------- | ---------- |
| Class 1 | ✅         | 31/31      |
| Class 2 | ✅         | 36/36      |
| Class 3 | ✅         | 32/32      |
| Class 4 | 🔲 planned | —          |
| Class 5 | 🔲 planned | —          |

---

## Extensibility Patterns

### Add a topic solver

1. Create `math_engine/topics/<topic>.py`
2. Wire into `engine.py` solver list (high-specificity first)
3. Add keywords to `topic_keywords.json`
4. Update `core/coverage.py` IMPLEMENTED_SOLVERS
5. Add regression cases → run eval

### Upgrade a class

1. Edit `math_engine/class_profiles/class_N.json`
2. Extend topic solvers as needed
3. Add regression cases → 100% required

### Add a curriculum book

1. Run ingestion CLIs — zero code changes

---

## What Remains

| Priority | Item                                                               |
| -------- | ------------------------------------------------------------------ |
| High     | Class 4 & 5 rule packs + solver expansion                          |
| High     | Multi-step word-problem parser                                     |
| Medium   | Additional video templates (place value, measurement, ordinals)    |
| Medium   | Cambridge / Edexcel curriculum profiles                            |
| Lower    | Wire child profiles to DB                                          |
| Lower    | `math_engine/llm_fallback.py` — structured LLM solver for unknowns |
| Lower    | CI eval gating per class                                           |
