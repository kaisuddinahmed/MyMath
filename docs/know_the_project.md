# Know the Project

This document explains the main folders and files in MyMath, how a shared problem is solved, and how the final video and narration are generated.

## 1. Project Structure and Roles

### Root files
- `README.md`
  - Overview of the product, quick start, API endpoints, and architecture notes.
- `.env` / `.env.example`
  - Environment variables for LLM model and Deepgram TTS.
- `package.json`
  - Node dependencies used by frontend and Remotion.
- `backend/`
  - Main API and solver backend.
- `remotion/`
  - React/Remotion video rendering project.
- `frontend/`
  - User-facing web UI.

### `backend/`
- `backend/main.py`
  - FastAPI entrypoint. Creates the app from `backend/api/app.py`.

- `backend/api/`
  - `app.py`
    - Builds the FastAPI app.
    - Mounts `/videos` static file hosting from `backend/video_engine/output`.
    - Registers routers for solve, video, extract, children, analytics, and curricula.
  - `schemas.py`
    - Pydantic models for request and response payloads.
    - Defines the data shapes used by solve and video endpoints.
  - `routes/`
    - `solve.py`
      - Core solve endpoints and full solve + render pipeline.
      - Handles `/solve`, `/solve-and-video-prompt`, `/solve-and-render`, and `/try-similar/by-child`.
      - Coordinates solver output, LLM video prompt generation, TTS, caching, and Remotion render.
    - `video.py`
      - `/render-video` endpoint.
      - Validates video JSON and calls the local template renderer.
    - `extract.py`
      - `/extract-problem` endpoint.
      - Receives uploaded image/PDF and delegates to the problem extractor.
    - `children.py`, `analytics.py`, `curricula.py`
      - Child profile management, activity logging, and curriculum metadata APIs.

- `backend/core/`
  - `llm.py`
    - LLM client wrapper and model selection.
  - `config.py`
    - App configuration helper functions.
  - `prompt_validator.py`
    - Video JSON schema and validation logic.
    - Defines `VIDEO_SCHEMA`, checks for correct answer, and scoring rules.

- `backend/math_engine/`
  - `engine.py`
    - Main math solver entrypoint with deterministic and fallback logic.
    - Dispatches to topic-specific solvers and builds verified results.
  - `grade_style.py`
    - Grade-specific style settings for vocabulary, pacing, and sentence length.
  - `topic_detector.py`
    - Detects math topic for practice generation and prompt guidance.
  - `topics/`
    - One file per topic, such as `arithmetic.py`, `fractions.py`, `geometry.py`, `comparison.py`, `place_value.py`, etc.
    - Each file contains deterministic solving logic for that topic.

- `backend/knowledge/`
  - Curriculum retrieval, knowledge database, and hints.
  - Used to inject curriculum-specific hints into the LLM prompt.

- `backend/video_engine/`
  - `renderer.py`
    - Legacy local renderer using MoviePy.
    - Converts `video_prompt_json` into images, audio, and MP4.
  - `tts.py`
    - Deepgram Aura text-to-speech integration.
    - Converts scene narration text into audio files.
  - `video_cache.py`
    - File-based cache keyed by question+grade.
    - Registers rendered video files and returns cached URLs.
  - `template_registry.py`
    - Loads curriculum style metadata and video prompt hints.
  - `templates/`
    - Rendering helpers used by the local fallback renderer.

- `backend/problem_extractor.py`
  - Handles uploaded images/PDFs and runs OCR / extraction.
  - Produces structured problem output and optional pre-solved answer/steps.

- `backend/video_generation/`
  - **Lean video generation orchestration module** (refactored for simplicity).
  - `master_prompt.py`
    - Refined LLM master prompt with exact validation rules for scene actions, required props, item types, narration requirements, duration estimates, and choreography logic.
    - Defines `MASTER_PROMPT_TEMPLATE` with 8 strict validation rules and complete examples.
    - `build_master_prompt()` function substitutes variables and returns ready-to-send prompt to LLM.
    - This is the **single source of truth** for what LLM can generate (22 exact scene actions with required props, 50+ curriculum item types, precise narration rules).
  - (Future) `llm_prompt_builder.py` — VideoPromptGenerator class
  - (Future) `tts_processor.py` — TTSProcessor class
  - (Future) `remotion_api.py` — render_video_via_remotion() function
  - (Future) `simple_cache.py` — VideoCacheManager class

### `remotion/`
- `render-api.js`
  - Remotion Express server.
  - Bundles the Remotion project and exposes `/render` for video generation.
- `src/index.ts`
  - Register Remotion root.
- `src/Root.tsx`
  - Main composition and entrypoint for the Remotion project.
- `src/components/Scenes/*.tsx`
  - Scene components for many math concepts.
- `src/components/Engines/*.tsx`
  - Lower-level render engines for animation building blocks.
- `src/assets/`
  - Visual assets used in the rendered video.

### `frontend/`
- React app pages and components.
- UI for entering problems, selecting child profile, and showing results.
- Consumes backend API endpoints.

## 2. How a shared problem becomes a solution

### Text problem flow
1. User submits a problem to one of the solve endpoints.
2. `backend/api/routes/solve.py` receives the request.
3. The solver calls `backend.math_engine.engine.solve()`.
4. `backend/math_engine/engine.py` routes the question to the correct topic solver:
   - MCQ detection
   - deterministic arithmetic solvers
   - topic-specific solvers in `backend/math_engine/topics/`
   - word-problem handling or fallback logic
5. The solver returns:
   - verified answer
   - step-by-step explanation
   - topic, template, and grade metadata
   - parsed context and parsed steps for word problems
6. `backend/api/routes/solve.py` uses the solver result to build the video prompt or return the solve response.

### Image/PDF problem flow
1. User uploads an image or PDF to `/extract-problem`.
2. `backend/api/routes/extract.py` receives the upload.
3. It calls `backend.problem_extractor.extract_math_problem_from_upload()`.
4. The extractor returns a structured question and any pre-solved answer/steps.
5. The extracted question can then be sent into the same solve pipeline.

### Solve+video prompt generation
1. `backend/api/routes/solve.py` runs `_run_solve_and_prompt()`.
2. It validates the solved result and builds a director prompt.
3. It gathers:
   - verified answer
   - topic and template
   - grade style rules from `backend.math_engine.grade_style`
   - curriculum style hints from `backend.video_engine.template_registry`
4. It sends a prompt to the LLM through `backend.core.llm`.
5. The LLM returns JSON representing `video_prompt_json`.
6. `backend.core.prompt_validator` validates the JSON and scores it.
7. The endpoint returns the solve result and the generated `video_prompt_json`.

## 3. How the video is generated

### Unified solve+render flow
1. `backend/api/routes/solve.py` runs `_run_solve_and_render()`.
2. It checks cache with `backend.video_engine.video_cache.lookup()`.
3. If cached, it returns the existing `/videos/<filename>` URL.
4. If not cached, it calls `_run_solve_and_prompt()` to produce `video_prompt_json`.
5. It generates narration audio for each scene via `backend.video_engine.tts.synthesize()`.
6. It sends the JSON and audio URLs to the Remotion server using `_render_via_remotion()`.
7. If Remotion succeeds, it registers the video in the cache and returns the video URL.
8. If Remotion fails, it falls back to the local renderer in `backend/video_engine/renderer.py`.

### Narration generation
- `backend/video_engine/tts.py` converts scene narration text to audio.
- It sanitizes math symbols for speech.
- It sends the text to Deepgram Aura and saves a `.wav` file.
- The generated audio file is copied into `backend/video_engine/output` and served via `/videos`.

### Remotion render details
- `remotion/render-api.js` exposes the render API.
- Remotion consumes the JSON script in `remotion/src/Root.tsx`.
- Scene components in `remotion/src/components/Scenes/` render the animation.
- Engine components in `remotion/src/components/Engines/` draw math visuals.
- The render output is saved as an MP4 and then served as a cached video.

### Local fallback renderer
- `backend/video_engine/renderer.py` is a fallback video renderer using MoviePy.
- It can also produce MP4 with built-in TTS if Remotion is unavailable.

### LLM Video Prompt Generation (Lean Orchestration)
- The **master prompt** (`backend/video_generation/master_prompt.py`) is the single source of truth for LLM video generation.
- It enforces **8 strict validation rules**:
  1. Scene actions: exactly one of 22 allowed actions (no typos, hallucinations, or invented actions)
  2. Required props per action: every action has explicit required/optional props that LLM must include
  3. Item types: 50+ curriculum objects only (APPLE_SVG, BIRD_SVG, HILSA_FISH_SVG, etc.) — no invented objects
  4. JSON validation: no markdown, no explanations, pure JSON with "scenes" array
  5. Narration: 1-4 sentences per scene, kid-friendly, matches action, includes correct answer in final scene
  6. Duration estimates: setup 4-6s, animation 3-5s, equation 2-3s, total ≤70s
  7. Choreography logic: clear rules for when to use CHOREOGRAPH_* vs. SHOW_SMALL_* vs. SHOW_PART_WHOLE_*
  8. Output format: complete examples and pre-flight verification checklist
- The `build_master_prompt()` function substitutes variables (age, problem, topic, curriculum, etc.) into the template.
- LLM returns a JSON "director script" with scenes, each scene specifying action, props, narration, and animation metadata.
- This JSON is then sent to Remotion for rendering with synced TTS audio.

## 4. Delivery and cache
- `backend/api/app.py` mounts `/videos` from `backend/video_engine/output`.
- `backend/video_engine/video_cache.py` registers and retrieves cached videos.
- Cached videos are served immediately without repeated render work.

## Summary
- `backend/` is the solve + render orchestration layer.
- `backend/math_engine/` contains verified math logic.
- `backend/api/routes/solve.py` wires the whole solve/video prompt/render flow.
- `backend/video_engine/` contains TTS, local fallback rendering, and caching.
- `remotion/` is the high-quality video renderer.
- `frontend/` is the app UI.

## Topic / Solver / Narration / Scene Files

| Topic | Solver file(s) | Video narration generation | Video scene generation |
|---|---|---|---|
| addition | `backend/math_engine/topics/arithmetic.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| subtraction | `backend/math_engine/topics/arithmetic.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| multiplication | `backend/math_engine/topics/arithmetic.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| division | `backend/math_engine/topics/arithmetic.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| fractions | `backend/math_engine/topics/fractions.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| place_value | `backend/math_engine/topics/place_value.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| comparison | `backend/math_engine/topics/comparison.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| counting | `backend/math_engine/topics/counting.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| ordinals | `backend/math_engine/topics/counting.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| patterns | `backend/math_engine/topics/patterns.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| measurement | `backend/math_engine/topics/measurement.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| currency | `backend/math_engine/topics/currency.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| geometry | `backend/math_engine/topics/geometry.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| averages | `backend/math_engine/topics/averages.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| multiples_factors | `backend/math_engine/topics/factors_multiples.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| decimals | `backend/math_engine/topics/decimals.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| percentages | `backend/math_engine/topics/percentages.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| ratio | `backend/math_engine/topics/ratio.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| data | `backend/math_engine/topics/data.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |
| word_problem | `backend/math_engine/word_problem_parser.py` + dispatch in `backend/math_engine/engine.py` | `backend/api/routes/solve.py` | `remotion/src/compositions/MathVideo.tsx` + topic scene components under `remotion/src/components/Scenes/` |

## 5. Scene action → component file mapping

The Remotion video router in `remotion/src/compositions/MathVideo.tsx` maps scene actions to specific scene components and files.

| Scene action(s) | Component | File |
|---|---|---|
| `ADD_ITEMS`, `REMOVE_ITEMS`, `HIGHLIGHT` | `CounterScene` | `remotion/src/components/Scenes.tsx` |
| `GROUP_ITEMS` | `GroupScene` | `remotion/src/components/Scenes.tsx` |
| `SPLIT_ITEM` | `FractionScene` | `remotion/src/components/Scenes/FractionScene.tsx` |
| `SHOW_EQUATION` | `EquationScene` | `remotion/src/components/Scenes.tsx` |
| `DRAW_SHAPE` | `GeometryScene` | `remotion/src/components/Scenes/GeometryScene.tsx` |
| `MEASURE` | `MeasurementScene` | `remotion/src/components/Scenes/MeasurementScene.tsx` |
| `PLOT_CHART` | `DataScene` | `remotion/src/components/Scenes/DataScene.tsx` |
| `BALANCE` | `AlgebraScene` | `remotion/src/components/Scenes/AlgebraScene.tsx` |
| `JUMP_NUMBER_LINE` | `NumberLineScene` | `remotion/src/components/Scenes/NumberLineScene.tsx` |
| `SHOW_PLACE_VALUE` | `PlaceValueScene` | `remotion/src/components/Scenes/PlaceValueScene.tsx` |
| `SHOW_BODMAS` | `BODMASScene` | `remotion/src/components/Scenes/BODMASScene.tsx` |
| `SHOW_EVEN_ODD` | `EvenOddScene` | `remotion/src/components/Scenes/EvenOddScene.tsx` |
| `SHOW_PERCENTAGE` | `PercentageScene` | `remotion/src/components/Scenes/PercentageScene.tsx` |
| `SHOW_COLUMN_ARITHMETIC` | `ColumnArithmeticScene` | `remotion/src/components/Scenes/ColumnArithmeticScene.tsx` |
| `SHOW_SMALL_ADDITION` | `SmallAdditionScene` | `remotion/src/components/Scenes/SmallAdditionScene.tsx` |
| `SHOW_MEDIUM_ADDITION` | `MediumAdditionScene` | `remotion/src/components/Scenes/MediumAdditionScene.tsx` |
| `CHOREOGRAPH_SUBTRACTION`, `CHOREOGRAPH_ADDITION` | `ChoreographyScene` | `remotion/src/components/Scenes/ChoreographyScene.tsx` |
| `SHOW_SMALL_SUBTRACTION` | `SmallSubtractionScene` or `ChoreographyScene` (bird fallback) | `remotion/src/components/Scenes/SmallSubtractionScene.tsx` / `remotion/src/components/Scenes/ChoreographyScene.tsx` |
| `SHOW_MEDIUM_SUBTRACTION` | `MediumSubtractionScene` | `remotion/src/components/Scenes/MediumSubtractionScene.tsx` |
| `SHOW_NUMBER_ORDERING` | `NumberOrderingScene` | `remotion/src/components/Scenes/NumberOrderingScene.tsx` |
| `SHOW_PART_WHOLE_SUBTRACTION` | `PartWholeScene` | `remotion/src/components/Scenes/PartWholeScene.tsx` |
| `SHOW_NUMBER_BOND` | `NumberBondScene` | `remotion/src/components/Scenes/NumberBondScene.tsx` |
| any other/unknown action | `CounterScene` | `remotion/src/components/Scenes.tsx` |
