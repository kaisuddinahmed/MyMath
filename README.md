# MyMath — Curriculum‑Aware Primary Math Video Explainer

MyMath helps primary students (Grades 1–5) **understand** math through short, visual explanation videos generated per question.

Core principles:
- **Correctness first:** math answers come from **deterministic solvers** (LLM is not trusted for final arithmetic).
- **Visual learning:** explanations use **simple objects and animations** (counters, groups, fraction pies).
- **Curriculum-aware, not curriculum-locked:** students can ask **any** question; the child profile (age/class/curriculum) controls *how* we explain, not *whether* we explain.

---

## What MyMath Does

For each question, MyMath produces:
1) Verified answer + short kid-friendly steps  
2) A **strict JSON video plan** (LLM output, schema validated)  
3) A deterministic **MP4** rendered from templates (no AI video randomness)  
4) Practice question(s) + a checkpoint question  

---

## Key Components

### 1) Deterministic Solver Layer (Trusted)
Current coverage (starter):
- Addition, subtraction
- Multiplication (equal groups)
- Division (exact division only)
- Fractions (limited forms like **1/2 of N**, **1/4 of N**)

> Expandable via topic engines (place value, measurement, currency, data, geometry, decimals, percentages, etc.).

### 2) Video Prompt Contract (Strict JSON)
- LLM must output **JSON only**
- Validated against `backend/video_prompt_schema.json`
- Auto-regenerate once if invalid
- Topic-specific constraints (e.g., multiplication must show “groups”, fractions must show “equal parts”)

### 3) Deterministic Video Renderer (Template → MP4)
- Renders MP4 from the validated JSON plan
- Starter templates:
  - Counters (add/sub)
  - Group boxes (mul/div)
  - Fraction pie (fractions)

### 4) Curriculum Intelligence Layer (RAG)
Supports multiple curricula (e.g., Bangladesh NCTB, Cambridge, Edexcel, Oxford AQA):
- Store textbooks in a vector DB
- Retrieve relevant chunks at runtime based on:
  - child’s preferred curriculum (optional)
  - child’s class level (strict or relaxed mode)
  - question topic and similarity

Used to align:
- terminology (e.g., regrouping/borrowing)
- example style (money/time/objects)
- prerequisites and pacing

---

## Repo Layout (High Level)

```
backend/
  main.py                  # API
  db.py                    # DB session/engine
  models.py schemas.py     # DB models + Pydantic schemas
  ingestion/               # PDF → pages → chunks → tags → embeddings
  retrieval.py             # query → top chunks
  video_engine/            # JSON → frames → MP4
  eval/                    # evaluation runner
docs/
  architecture.md
  ingestion.md
  eval.md
frontend/
  index.html               # placeholder (UI can be Next.js/React later)
```

---

## Run Locally (Backend)

### 1) Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 2) Environment
Create a local `.env` (do not commit):
```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/mymath
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile
EMBEDDING_PROVIDER=...
EMBEDDING_MODEL=...
```

### 3) Run API
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233
```
Open:
- `http://127.0.0.1:1233/`
- `http://127.0.0.1:1233/docs`

---

## Primary API Endpoints (Typical Flow)
- `POST /children` → create child profile (age/class, optional curriculum)
- `POST /solve-and-video-prompt/by-child` → returns:
  - verified answer/steps
  - retrieved curriculum chunk ids (if used)
  - validated JSON video plan + score
- `POST /render-video` → returns MP4 path/URL (from JSON plan)
- `GET /coverage` → topic coverage status
- `GET /analytics/*` → prompt/quality analytics

---

## Ingest a Textbook PDF (RAG Pipeline)
See `docs/ingestion.md`. Typical pipeline per PDF:
1) Create curriculum + book records (`/api/curricula`, `/api/books`)
2) `ingest_book` → `raw_pages.jsonl`
3) `chunk_book` → `chunks.jsonl`
4) `load_chunks` → upsert DB
5) `tag_chunks` → topic/subtopic/difficulty
6) `embed_chunks` → vector DB upsert

---

## License
MIT
