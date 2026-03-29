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
  class_profiles/          # per-curriculum, per-class JSON rule packs
    nctb/                  # topics_in_scope, constraints, topic_constraints, chapter_rules, visual_metaphors
      class_1.json  ✅  class_2.json  ✅  class_3.json  ✅
      class_4.json  ⚠️ partial   class_5.json  ⚠️ partial
    cambridge/             # class_1–5.json  🚧 scaffold
    edexcel/               # class_1–5.json  🚧 scaffold
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

### Solver coverage
15 topic categories, 20/21 solvers ready (95%).

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
  curriculum_policy.py  # load_curriculum_policy(curriculum, class_level)
                        # → reads class_profiles/{curriculum}/class_{N}.json
                        # → validates topic scope, number range, fraction/decimal rules
  activity.py           # bounded activity log (300 records, file-based)
  retrieval.py          # retrieve_chunks(question, curriculum_id, class_level)
  db.py / models.py     # ORM — ChildProfile, Book, Chunk, Embedding, AuditLog
  ingestion/            # offline CLIs only
    ingest_book.py → chunk_book.py → load_chunks.py → tag_chunks.py → embed_chunks.py
```

---

### Layer 4 — `backend/video_engine/` + `remotion/` — Video Engine (V2)

```
video_engine/
  tts.py               # Deepgram Aura TTS: narration text → .wav  (~$0.015/1K chars)
  video_cache.py       # SHA-256 cache: cache_key(question, grade) → filename
  template_registry.py # Template registry + load_curriculum_style() + get_visual_metaphors_for_topic()
  curriculum_styles/   # Per-curriculum visual/cultural style descriptors
    nctb.json          # Bangladeshi cultural context, visual metaphors per topic, narration tone
    cambridge.json     # 🚧 scaffold
    edexcel.json       # 🚧 scaffold
  renderer.py          # Legacy PIL renderer — fallback when Remotion is unavailable
  templates/           # counters.py, groups.py, fraction.py  (legacy)
  output/              # MP4 files + cache_index.json + TTS .wav files

remotion/              # Remotion animated video renderer (Node.js service)
  render-api.js        # Express server (port 1235) — POST /render
  src/
    Root.tsx                   # Remotion composition registry
    types.ts                   # DirectorScript, DirectorScene — includes curriculum? and visual_metaphor?
    compositions/MathVideo.tsx # Router: maps 16+ SceneActions to respective rendering components
    components/Scenes/         # Specialized engines (BODMASScene, SmallAdditionScene, etc.)
    assets/items/ItemSvgs.tsx  # SVG items: Apple, Block, Star, Counter
```

**Curriculum-driven rendering:** The LLM prompt builder reads `curriculum_styles/{curriculum}.json` to inject cultural visual metaphors into the Director Script. Each `DirectorScene` carries an optional `visual_metaphor` field (e.g. `"fish"` for NCTB, `"ten-frame"` for Cambridge). Scenes are parameterized — not duplicated per curriculum.

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

Available actions: `ADD_ITEMS` · `REMOVE_ITEMS` · `GROUP_ITEMS` · `SPLIT_ITEM` · `SHOW_EQUATION` · `HIGHLIGHT` · `JUMP_NUMBER_LINE` · `SHOW_PLACE_VALUE` · `SHOW_COLUMN_ARITHMETIC` · `SHOW_BODMAS` · `SHOW_EVEN_ODD` · `SHOW_PERCENTAGE` · `DRAW_SHAPE` · `PLOT_CHART` · `MEASURE` · `BALANCE`
Available animations: `BOUNCE_IN` · `FADE_IN` · `SLIDE_LEFT` · `POP` · `NONE`

### Column arithmetic narration
For column arithmetic problems (e.g. `1254 - 78`, `456 + 78`), narration is never trusted to the LLM.

1. `backend/api/routes/solve.py` computes deterministic narration first.
   - `SUBTRACTION` tracks borrow state and remaining digits.
   - `ADDITION` tracks carry-forward values.
2. The LLM still generates the scene skeleton and structure.
3. `_force_column_narrations` overwrites every `narration` field in `SHOW_COLUMN_ARITHMETIC` scenes with deterministic text.

This keeps column-by-column math narration mathematically correct even when the LLM scene structure is used for visuals.

**Files involved:**
| Function | Location | Purpose |
| --- | --- | --- |
| `_build_column_narrations(topic, question)` | `backend/api/routes/solve.py` | Computes deterministic narration per column |
| `_force_column_narrations(json, topic, question)` | `backend/api/routes/solve.py` | Replaces LLM narration in `SHOW_COLUMN_ARITHMETIC` scenes |
| `_build_topic_guidance(...)` | `backend/api/routes/solve.py` | Builds the LLM prompt guidance for scene structure |

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

## Curriculum Profiles

### NCTB (Bangladesh) — `class_profiles/nctb/`

| Class   | Profile    | Regression | Eval path                      |
| ------- | ---------- | ---------- | ------------------------------ |
| Class 1 | ✅ full    | 31/31      | `eval/nctb/class_1_cases.json` |
| Class 2 | ✅ full    | 36/36      | `eval/nctb/class_2_cases.json` |
| Class 3 | ✅ full    | 32/32      | `eval/nctb/class_3_cases.json` |
| Class 4 | ⚠️ partial | untested   | not yet                        |
| Class 5 | ⚠️ partial | untested   | not yet                        |

### Cambridge & Edexcel — `class_profiles/{curriculum}/`

| Curriculum | Class 1–5   | Notes                           |
| ---------- | ----------- | ------------------------------- |
| Cambridge  | 🚧 scaffold | Stubs with topics_in_scope only |
| Edexcel    | 🚧 scaffold | Stubs with topics_in_scope only |

---

## Extensibility Patterns

### Add a topic solver

1. Create `math_engine/topics/<topic>.py`
2. Wire into `engine.py` solver list (high-specificity first)
3. Add keywords to `topic_keywords.json`
4. Update `core/coverage.py` IMPLEMENTED_SOLVERS
5. Add regression cases → run eval

### Upgrade a class

1. Edit `math_engine/class_profiles/{curriculum}/class_N.json`
2. Expand `video_engine/curriculum_styles/{curriculum}.json` visual metaphors for new topics
3. Extend topic solvers if new topics require it
4. Add regression cases to `eval/{curriculum}/class_N_cases.json` → 100% required

### Add a new curriculum

1. Fill in `class_profiles/{curriculum}/class_N.json` (stubs already exist for Cambridge + Edexcel)
2. Fill in `video_engine/curriculum_styles/{curriculum}.json`
3. Add eval cases to `eval/{curriculum}/`
4. ✅ Math solvers, API, Remotion scenes — untouched (parameterized, not duplicated)

### Add a curriculum book (RAG)

1. Run ingestion CLIs — zero code changes

---

## What Remains

| Priority | Item                                                              |
| -------- | ----------------------------------------------------------------- |
| High     | NCTB Class 1 — finalize topic-by-topic (chapter rules, metaphors) |
| High     | Wire `curriculum_styles/nctb.json` into video prompt LLM call     |
| High     | NCTB Class 4 & 5 profile + solver expansion                       |
| Medium   | Multi-step word-problem parser                                    |
| Medium   | Cambridge curriculum profiles (stubs ready)                       |
| Medium   | Edexcel curriculum profiles (stubs ready)                         |
| Lower    | Wire child profiles to DB (models ready)                          |
| Lower    | CI eval gating per class                                          |
