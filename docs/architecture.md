# MyMath — Architecture

## Goal

Generate curriculum-aware, age-appropriate **visual math explanations (MP4)** for primary learners (Grades 1–5), while guaranteeing **math correctness** via deterministic solvers.

---

## Runtime Flow (Question → Video)

```
Child question (typed or uploaded image/PDF)
      │
      ▼
[Extract & Classify]  backend/problem_extractor.py
      │  llm_extract_structured(raw_ocr)
      │  → Cleans OCR noise, classifies question type
      │  → Evaluates MCQ options, pre-solves answer
      │  → Falls back to regex helpers if LLM unavailable
      │  Returns: { question, question_type, options[], pre_solved_answer, pre_solved_steps }
      │
      ▼
[API Layer]  backend/api/routes/solve.py
      │  POST /solve-and-render/by-child
      │
      ├─► Cache lookup  (video_cache.py)
      │         HIT → return /videos/<hash>.mp4  ⚡ instant, $0
      │         MISS ↓
      │
      ▼
[Math Engine]  backend/math_engine/engine.solve()
      │  ┌─ LLM pre-solved fast path ─ if pre_solved_answer present → immediate SolveResult
      │  └─ Cascading solver pipeline (see below)
      │
      ▼
[LLM — Groq]  backend/core/llm.py
      │  Director Script JSON (action-based scenes)
      │  e.g. { action: "ADD_ITEMS", item_type: "APPLE_SVG",
      │         count: 3, animation_style: "BOUNCE_IN" }
      │
      ▼
[Prompt Validator]  backend/core/prompt_validator.py
      │  Schema + hard topic checks + score (0–100)
      │
      ▼
[TTS — Deepgram Aura]  backend/video_engine/tts.py
      │  Narration text → .wav   (~$0.008/video)
      │
      ▼
[Video Engine — Remotion]  remotion/render-api.js  (port 1235)
      │  Director Script + audio → animated MP4
      │  React components: CounterScene, GroupScene,
      │  FractionScene, EquationScene, TitleCard
      │  Fallback → backend/video_engine/renderer.py (PIL)
      │
      ▼
[Cache Register]  video_cache.py
      │  hash → filename written to cache_index.json
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
LLM pre-solved fast path  (from extraction — for MCQ, fill-blank, true/false, sequence, word problems)
  → Arithmetic regex      (highest confidence — bare equations like 12 ÷ 4)
  → fractions, factors, percentages, decimals, ratio, averages
  → measurement, geometry, data, currency, patterns, place_value
  → comparison, counting  (broadest patterns — run last)
  → word_problem_parser   (sentence fallback)
  → AI-assisted           (returns topic + signals LLM)
```

**Public interface:**

```python
def solve(
    question: str,
    grade: int,
    curriculum_hints: list[str] = [],
    pre_solved_answer: str | None = None,   # from llm_extract_structured
    pre_solved_steps: list[str] | None = None,
) -> SolveResult
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

### Layer 4 — `backend/video_engine/` + `remotion/` — Video Engine (V2)

```
video_engine/
  tts.py              # Deepgram Aura TTS: narration text → .wav  (~$0.015/1K chars)
  video_cache.py      # SHA-256 cache: cache_key(question, grade) → filename
  renderer.py         # Legacy PIL renderer — fallback when Remotion is unavailable
  templates/          # counters.py, groups.py, fraction.py  (legacy)
  output/             # MP4 files + cache_index.json + TTS .wav files

remotion/             # Remotion animated video renderer (Node.js service)
  render-api.js       # Express server (port 1234) — POST /render
  src/
    Root.tsx                  # Remotion composition registry
    compositions/MathVideo.tsx # Sequences scenes + audio
    components/Scenes.tsx      # CounterScene, GroupScene, FractionScene,
                               #   EquationScene, TitleCard, NarrationBar
    assets/items/ItemSvgs.tsx  # SVG items: Apple, Block, Star, Counter
```

**Director Cue scene schema** (generated by LLM):

```json
{
  "action": "ADD_ITEMS",
  "item_type": "APPLE_SVG",
  "count": 3,
  "animation_style": "BOUNCE_IN",
  "narration": "Let's bring in three red apples!"
}
```

Available actions: `ADD_ITEMS` · `REMOVE_ITEMS` · `GROUP_ITEMS` · `SPLIT_ITEM` · `SHOW_EQUATION` · `HIGHLIGHT`
Available animations: `BOUNCE_IN` · `FADE_IN` · `SLIDE_LEFT` · `POP` · `NONE`

**Cost:** ~$0.008 TTS + $0 Remotion = **~$0.02/new video**. Cache hit = **$0**.

---

### Layer 5 — `backend/api/` — HTTP Interface

```
api/
  app.py        # FastAPI factory — middleware + router wiring
  schemas.py    # all Pydantic models (incl. pre_solved_answer, video_url, video_cached)
  routes/
    children.py   GET/POST/PATCH /children
    solve.py      /solve, /solve-and-render (V2), /solve-and-video-prompt (legacy), /try-similar/by-child
    video.py      /render-video  (legacy)
    extract.py    /extract-problem  (Upload → Pre-process → OCR → llm_extract_structured → question + pre_solved_answer)
    analytics.py  /activity, /coverage, /analytics/*
```

### Extraction Pipeline Detail

```
Upload (image/PDF)
  │
  ├── Pre-process: upscale, sharpen, binarize
  │
  ├── OCR: rapidocr-onnxruntime (primary) or pytesseract (fallback)
  │
  └── llm_extract_structured(raw_ocr)
        ├─ Fixes OCR noise (typos, merged words)
        ├─ Identifies question_type: mcq | word_problem | fill_blank |
        │                            true_false | sequence | arithmetic |
        │                            comparison | geometry | other
        ├─ For MCQ: evaluates each option numerically
        │    "200 more than 3604" → 3804
        │    "3 thousands, 7 hundreds and 4 ones" → 3704
        │    "3000 + 700 + 4" → 3704
        ├─ Identifies correct/incorrect option
        ├─ pre_solves answer with child-friendly steps
        └─ Falls back to regex helpers if LLM unavailable
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

| Class   | Status | Regression |
| ------- | ------ | ---------- |
| Class 1 | ✅     | 31/31      |
| Class 2 | ✅     | 36/36      |
| Class 3 | ✅     | 32/32      |
| Class 4 | ✅     | untested   |
| Class 5 | ✅     | untested   |

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

| Priority | Item                                      |
| -------- | ----------------------------------------- |
| High     | Class 4 & 5 rule packs + solver expansion |
| High     | Multi-step word-problem parser            |
| Medium   | Cambridge / Edexcel curriculum profiles   |
| Lower    | Wire child profiles to DB                 |
| Lower    | CI eval gating per class                  |
