# MyMath Architecture

## Goal
Generate curriculum-aware, age-appropriate **visual math explanations** (MP4) for primary learners while guaranteeing **math correctness** via deterministic solvers.

---

## System Overview

### Runtime (User Question → Video)
1. **Input**: question + child_id (profile includes class_level + optional preferred curriculum)
2. **Topic detection**: regex + keyword map
3. **Curriculum retrieval (RAG)**:
   - embed question
   - retrieve top K chunks filtered by curriculum_id and class_level (strict/relaxed)
4. **Deterministic solve**:
   - compute verified answer + steps
5. **LLM video plan generation**:
   - LLM produces **strict JSON** conforming to schema
   - inject: verified answer, chosen visual template, grade style, curriculum hints
6. **Validation & scoring**:
   - JSON schema validation
   - topic-specific constraints
   - prompt score (0–100), regen once if invalid
7. **Renderer**:
   - template engine converts plan → frames
   - TTS generates narration
   - movie composer merges into MP4
8. **Logging**:
   - audit log: question, retrieved_chunk_ids, score, schema_valid, video_path

---

## Key Design Choices

### Deterministic correctness
- LLM is used for *pedagogy and sequencing*, not for the final numeric answer.
- Solver layer is extended topic-by-topic (place value, measurement, currency, etc.).

### Strict video prompt contract
- LLM output must be JSON-only.
- Schema validation + targeted checks prevent unusable plans.

### Deterministic rendering
- Avoids AI text-to-video inconsistency (object counts, layouts).
- Templates map 1:1 to primary math visuals.

### Curriculum-aware, not curriculum-locked
- Child can ask anything.
- Curriculum influences vocabulary, pacing, and examples.
- Strict class level is optional.

---

## Data Model (Core)
- **Curriculum**: board/country/language
- **Book**: curriculum_id + class_level + metadata
- **Chunk**: book_id + pages + text + tags (topic/subtopic/difficulty/keywords)
- **Embedding**: chunk_id + vector + metadata (stored in vector DB)
- **ChildProfile**: class_level + preferred_curriculum_id + strict_class_level
- **AuditLog**: request trace + quality metrics

---

## Curriculum Ingestion Pipeline (Offline)
PDF → raw pages → chunks → DB upsert → tagging → embeddings
Outputs:
- per-book load summary (pages/chunks/embedded)
- searchable retrieval index per curriculum

---

## Extensibility Roadmap (Technical)
- Add topic engines: place value, measurement (time/length/weight), currency, data, patterns, geometry, decimals, percentages, averages, factors.
- Add word-problem parser and unit normalization (taka, cm, kg, time).
- Add UI (Next.js/React) with parent dashboard + child mode.
- Add evaluation sets per curriculum/class and CI gating (accuracy + schema valid rate + score thresholds).
