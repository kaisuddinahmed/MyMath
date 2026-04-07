# MyMath — Project Map

> Use this to pinpoint exactly which file and line to edit for any change.

---

## 1. User Input

| User Flow                              | Backend Process                   | Responsible File                                                      |
| -------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| Child types or uploads a question      | —                                 | `frontend/app/child/page.tsx`                                         |
| Photo/PDF upload → extract text        | `POST /extract-problem`           | `frontend/lib/api.ts` → `extractProblem()`                            |
| OCR image processing + cleanup         | PIL resize, denoise, tesseract    | `backend/problem_extractor.py` → `extract_math_problem_from_upload()` |
| LLM cleans noisy OCR text              | Groq call with structured prompt  | `backend/problem_extractor.py` → `llm_extract_structured()`           |
| Submit question for solving            | `POST /solve-and-render/by-child` | `frontend/lib/api.ts` → `solveAndRenderByChild()`                     |
| Child profile used (grade, curriculum) | Looked up from in-memory store    | `backend/api/routes/children.py` → `CHILDREN` dict                    |

---

## 2. Math Solving

| User Flow                           | Backend Process                                        | Responsible File                                           |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| Question routed to solver           | `engine_solve(question, grade)`                        | `backend/math_engine/engine.py` → `solve()`                |
| Topic detected from question text   | Keyword + pattern matching                             | `backend/math_engine/topic_detector.py` → `detect_topic()` |
| Topic-specific math solved          | Dispatched per topic                                   | `backend/math_engine/topics/<topic>.py`                    |
| **Addition**                        | `arithmetic.py`                                        | `backend/math_engine/topics/arithmetic.py`                 |
| **Subtraction**                     | `arithmetic.py`                                        | `backend/math_engine/topics/arithmetic.py`                 |
| **Comparison**                      | `comparison.py`                                        | `backend/math_engine/topics/comparison.py`                 |
| **Counting**                        | `counting.py`                                          | `backend/math_engine/topics/counting.py`                   |
| **Geometry**                        | `geometry.py`                                          | `backend/math_engine/topics/geometry.py`                   |
| **Fractions**                       | `fractions.py`                                         | `backend/math_engine/topics/fractions.py`                  |
| **Place Value**                     | `place_value.py`                                       | `backend/math_engine/topics/place_value.py`                |
| **Patterns**                        | `patterns.py`                                          | `backend/math_engine/topics/patterns.py`                   |
| **Currency**                        | `currency.py`                                          | `backend/math_engine/topics/currency.py`                   |
| **Measurement**                     | `measurement.py`                                       | `backend/math_engine/topics/measurement.py`                |
| Word problem actors/numbers parsed  | Extracts names, quantities, objects                    | `backend/math_engine/word_problem_parser.py`               |
| Grade style applied (pacing, vocab) | Per-grade narration style hints                        | `backend/math_engine/grade_style.py`                       |
| Solve result returned               | `SolveResult(topic, answer, steps, template, subtype)` | `backend/math_engine/engine.py` → `SolveResult` dataclass  |

---

## 3. Narration Building

| User Flow                      | Backend Process                                           | Responsible File                                                |
| ------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------- |
| Narration builder selected     | Routes by `(grade, curriculum)`                           | `backend/video/narration/router.py` → `build_narration()`       |
| **Class 1 NCTB entry point**   | `build(solve_result)` called                              | `backend/video/narration/nctb/class_1.py` → `build()`           |
| Subtype detected               | Identifies word problem pattern                           | `backend/video/narration/nctb/class_1.py` → `_detect_subtype()` |
| **Narration beat constructed** | `NarrationBeat(text, action, equation, item_type, extra)` | `backend/video/narration/base.py` → `NarrationBeat` dataclass   |
| Beat converted to scene dict   | `beat.to_scene_dict()`                                    | `backend/video/narration/base.py` → `to_scene_dict()`           |

### Class 1 Topic → Narration Function Map

| Topic             | Subtype                    | Narration Function                           | File Location                            |
| ----------------- | -------------------------- | -------------------------------------------- | ---------------------------------------- |
| Addition          | small word problem (≤10)   | `_addition_small_word()`                     | `nctb/class_1.py` line ~555              |
| Addition          | small word problem (11–20) | `_addition_small_word()`                     | `nctb/class_1.py`                        |
| Addition          | medium (column style)      | `_addition_medium()`                         | `nctb/class_1.py`                        |
| Addition          | story/choreography         | `_addition_story()`                          | `nctb/class_1.py`                        |
| Subtraction       | story (birds, objects)     | `_subtraction_story()`                       | `nctb/class_1.py` line ~685              |
| Subtraction       | medium                     | `_subtraction_medium()`                      | `nctb/class_1.py`                        |
| Subtraction       | part-whole                 | `_subtraction_part_whole()`                  | `nctb/class_1.py`                        |
| Comparison        | greater/less/equal         | `_comparison()`                              | `nctb/class_1.py`                        |
| Counting          | basic count                | `_counting()`                                | `nctb/class_1.py`                        |
| Numbers           | identify/write             | `_numbers()`                                 | `nctb/class_1.py`                        |
| Geometry          | shape recognition          | `_geometry()`                                | `nctb/class_1.py`                        |
| Patterns          | sequence completion        | `_patterns()`                                | `nctb/class_1.py`                        |
| Currency          | taka/poisha                | `_currency()`                                | `nctb/class_1.py`                        |
| **Add new grade** | any                        | Create `nctb/class_2.py`, register in router | `narration/router.py` → `_BUILDERS` dict |

### Narration Text (what the child hears)

| Change                                 | Where                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Edit spoken words for a beat           | The `text=` field inside the relevant `_function()` in `nctb/class_1.py`     |
| Change equation shown on screen        | The `equation=` field in the same beat                                       |
| Change the object shown (flower→apple) | The `item_type=` field — must match an `ItemType` in `remotion/src/types.ts` |
| Change number of items displayed       | The `items_count=` or `extra={"choreography_total": N}` field                |
| Add a new narration beat               | Add a new `NarrationBeat(...)` to the list returned by the function          |
| Change celebration behaviour           | Celebration auto-fires from `correct_answer` — edit `CelebrationBurst.tsx`   |

---

## 4. TTS (Audio Generation)

| User Flow                        | Backend Process                          | Responsible File                                                |
| -------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Narration text sent to Deepgram  | `synthesize(text, output_path)`          | `backend/video/tts.py` → `synthesize()`                         |
| Math symbols replaced with words | `+ → "plus"`, `= → "equals"`, etc.       | `backend/video/tts.py` → `sanitize_for_tts()`                   |
| Voice model used                 | `aura-asteria-en` (warm female)          | `backend/video/tts.py` → `DEFAULT_VOICE` constant               |
| **Change voice**                 | Edit constant                            | `backend/video/tts.py` line 18: `DEFAULT_VOICE = "aura-..."`    |
| **Fix mispronunciation**         | Add to replacements dict                 | `backend/video/tts.py` → `sanitize_for_tts()` replacements dict |
| WAV saved to output folder       | Copied to `backend/video_engine/output/` | `backend/video/pipeline.py` → `_generate_tts()`                 |
| API key loaded                   | From `.env` at startup                   | `backend/main.py` → `load_dotenv()`                             |

---

## 5. Audio–Video Sync

| User Flow                         | Backend Process                                        | Responsible File                                                            |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Audio duration measured           | `wave.open()` reads WAV frame count                    | `backend/video/pipeline.py` → `_wav_duration_frames()`                      |
| Duration converted to frames      | `seconds × 30fps`                                      | `backend/video/pipeline.py` → `_compute_scene_durations()`                  |
| Audio served as HTTP URL          | `http://localhost:1233/videos/<file>.wav`              | `backend/video/pipeline.py` → `_build_audio_urls()`                         |
| Durations + URLs sent to Remotion | `POST /render {script, audioUrls, sceneDurations}`     | `backend/video/pipeline.py` → `_render()`                                   |
| Remotion receives sceneDurations  | Extracted from request body                            | `remotion/render-api.js` line 64                                            |
| Scene duration applied in player  | `dur = sceneDurations[i] + 1.5s padding`               | `remotion/src/compositions/MathVideo.tsx` line ~97                          |
| Audio track placed in timeline    | `<Audio>` inside `<Sequence from={sceneStart + 0.5s}>` | `remotion/src/compositions/MathVideo.tsx` line ~247                         |
| **Change audio start offset**     | 0.5s delay before voice starts                         | `MathVideo.tsx` → `sceneStarts[i].start + Math.round(fps * 0.5)`            |
| **Change digestion padding**      | 1.5s after audio ends before next scene                | `MathVideo.tsx` → `dur = sceneDurations[i] + (1.5 * fps)`                   |
| **FPS setting**                   | 30fps hardcoded                                        | `remotion/render-api.js` (composition default) and `pipeline.py` `FPS = 30` |

---

## 6. Remotion Scene Rendering

### Scene Grouping (how consecutive scenes become one visual)

| Condition                         | What happens                                           | Where                                           |
| --------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| 3× `SHOW_SMALL_ADDITION` in a row | Grouped into one `SmallAdditionScene`                  | `MathVideo.tsx` lines ~118–150 (grouping logic) |
| Each group's sub-scene durations  | Drive internal animation phases                        | `SmallAdditionScene.tsx` → `timings` prop       |
| **Add a new groupable action**    | Add `lastGroup.action === "X" && scene.action === "X"` | `MathVideo.tsx` grouping block                  |

### Scene Action → Component Map

| Action string                              | Visual component                    | File                                |
| ------------------------------------------ | ----------------------------------- | ----------------------------------- |
| `SHOW_SMALL_ADDITION`                      | `SmallAdditionScene`                | `Scenes/SmallAdditionScene.tsx`     |
| `SHOW_MEDIUM_ADDITION`                     | `MediumAdditionScene`               | `Scenes/MediumAdditionScene.tsx`    |
| `SHOW_MEDIUM_SUBTRACTION`                  | `MediumSubtractionScene`            | `Scenes/MediumSubtractionScene.tsx` |
| `SHOW_SMALL_SUBTRACTION`                   | `SmallSubtractionScene`             | `Scenes/SmallSubtractionScene.tsx`  |
| `CHOREOGRAPH_ADDITION`                     | `ChoreographyScene` (addition mode) | `Scenes/ChoreographyScene.tsx`      |
| `CHOREOGRAPH_SUBTRACTION`                  | `ChoreographyScene` (story mode)    | `Scenes/ChoreographyScene.tsx`      |
| `SHOW_PART_WHOLE_SUBTRACTION`              | `PartWholeScene`                    | `Scenes/PartWholeScene.tsx`         |
| `SHOW_NUMBER_ORDERING`                     | `NumberOrderingScene`               | `Scenes/NumberOrderingScene.tsx`    |
| `SHOW_NUMBER_BOND`                         | `NumberBondScene`                   | `Scenes/NumberBondScene.tsx`        |
| `SHOW_COLUMN_ARITHMETIC`                   | `ColumnArithmeticScene`             | `Scenes/ColumnArithmeticScene.tsx`  |
| `DRAW_SHAPE`                               | `GeometryScene`                     | `Scenes/GeometryScene.tsx`          |
| `SHOW_PLACE_VALUE`                         | `PlaceValueScene`                   | `Scenes/PlaceValueScene.tsx`        |
| `SPLIT_ITEM`                               | `FractionScene`                     | `Scenes/FractionScene.tsx`          |
| `MEASURE`                                  | `MeasurementScene`                  | `Scenes/MeasurementScene.tsx`       |
| `PLOT_CHART`                               | `DataScene`                         | `Scenes/DataScene.tsx`              |
| `BALANCE`                                  | `AlgebraScene`                      | `Scenes/AlgebraScene.tsx`           |
| `JUMP_NUMBER_LINE`                         | `NumberLineScene`                   | `Scenes/NumberLineScene.tsx`        |
| `SHOW_BODMAS`                              | `BODMASScene`                       | `Scenes/BODMASScene.tsx`            |
| `SHOW_EVEN_ODD`                            | `EvenOddScene`                      | `Scenes/EvenOddScene.tsx`           |
| `SHOW_PERCENTAGE`                          | `PercentageScene`                   | `Scenes/PercentageScene.tsx`        |
| `ADD_ITEMS` / `REMOVE_ITEMS` / `HIGHLIGHT` | `CounterScene`                      | `components/Scenes.tsx`             |
| `SHOW_EQUATION`                            | `EquationScene`                     | `components/Scenes.tsx`             |
| `GROUP_ITEMS`                              | `GroupScene`                        | `components/Scenes.tsx`             |
| _(anything else)_                          | `CounterScene` (default fallback)   | `MathVideo.tsx` default case        |

### SmallAdditionScene Internal Phases (most used for Class 1)

| Phase                            | Triggered by                   | Where in file                                               |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| Group A items pop in             | `timings[0]` start             | `SmallAdditionScene.tsx`                                    |
| + sign appears, Group B pops in  | `step1End = timings[0].dur`    | `SmallAdditionScene.tsx`                                    |
| Groups merge together            | `step2End = timings[1].dur`    | `SmallAdditionScene.tsx`                                    |
| Count animation + equation shown | `step3End = timings[2].dur`    | `SmallAdditionScene.tsx`                                    |
| **Fix Group B pop-in timing**    | `rightPopDelay` in ObjectArray | `Engines/ObjectArray.tsx`                                   |
| **Fix gap between groups**       | `additionGap` interpolation    | `Engines/ObjectArray.tsx`                                   |
| **Fix item size**                | `itemSize` prop                | `ObjectArray.tsx` or scene call in `SmallAdditionScene.tsx` |

---

## 7. Visual Style & Background

| Change                               | Where                                          | Responsible File                              |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| Background colour/theme per topic    | `themeForTopic(topic)` → returns theme name    | `components/primitives/CartoonBackground.tsx` |
| Add a new background theme           | Add to theme switch in `CartoonBackground.tsx` | `components/primitives/CartoonBackground.tsx` |
| Celebration burst (stars, answer)    | `CelebrationBurst` shown after all scenes      | `components/primitives/CelebrationBurst.tsx`  |
| Confetti animation                   | Used inside CelebrationBurst                   | `components/primitives/Confetti.tsx`          |
| Item SVG icons (apple, flower, etc.) | All SVG definitions                            | `assets/items/ItemSvgs.tsx`                   |
| **Add a new item icon**              | Add SVG + add string to `ItemType`             | `assets/items/ItemSvgs.tsx` + `types.ts`      |
| Bird asset (for choreography)        | Animated cartoon bird                          | `assets/items/CartoonBird.tsx`                |
| Tree branch asset                    | Used in ChoreographyScene                      | `assets/items/TreeBranch.tsx`                 |
| Font (Nunito / Comic Sans)           | `KID_FONT` constant                            | `MathVideo.tsx` line ~44                      |

---

## 8. Video Pipeline Orchestration

| Step                         | Process                                          | Responsible File                             |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Full pipeline entry point    | `run(solve_result, child)`                       | `backend/video/pipeline.py`                  |
| Cache check (skip re-render) | SHA256(question + grade) lookup                  | `backend/video/cache.py` → `lookup()`        |
| Cache register after render  | Writes filename to `cache_index.json`            | `backend/video/cache.py` → `register()`      |
| Cache storage location       | `backend/video_engine/output/cache_index.json`   | `backend/video/cache.py` → `OUTPUT_DIR`      |
| **Clear video cache**        | Delete files from `output/` + `cache_index.json` | `backend/video_engine/output/` folder        |
| Remotion server URL          | `http://localhost:1235`                          | `backend/video/pipeline.py` → `REMOTION_URL` |
| Backend port for audio URLs  | `http://localhost:1233`                          | `backend/video/pipeline.py` → `BACKEND_PORT` |
| Remotion render API server   | Bundles project, calls `renderMedia()`           | `remotion/render-api.js`                     |
| Remotion port                | 1235 (env: `REMOTION_PORT`)                      | `remotion/render-api.js` line 9              |
| Output video location        | `backend/video_engine/output/<name>.mp4`         | `remotion/render-api.js` → `OUTPUT_DIR`      |
| Video served to frontend     | FastAPI static mount `/videos/`                  | `backend/api/app.py` → `VIDEO_OUTPUT_DIR`    |

---

## 9. API Layer

| Endpoint                          | Purpose                          | File                              |
| --------------------------------- | -------------------------------- | --------------------------------- |
| `POST /solve`                     | Solve only, no video             | `backend/api/routes/solve.py`     |
| `POST /solve-and-render/by-child` | Full pipeline — primary endpoint | `backend/api/routes/solve.py`     |
| `POST /extract-problem`           | OCR photo/PDF → question text    | `backend/api/routes/extract.py`   |
| `GET /children`                   | List child profiles              | `backend/api/routes/children.py`  |
| `POST /children`                  | Create child profile             | `backend/api/routes/children.py`  |
| `PATCH /children/:id`             | Update child profile             | `backend/api/routes/children.py`  |
| `GET /activity`                   | Child's question history         | `backend/api/routes/analytics.py` |
| `GET /coverage`                   | Topic coverage report            | `backend/api/routes/analytics.py` |
| `GET /curricula`                  | Available curriculum list        | `backend/api/routes/curricula.py` |
| `GET /videos/<file>`              | Serve rendered mp4 / wav         | `backend/api/app.py` static mount |
| Request/response shapes           | All Pydantic schemas             | `backend/api/schemas.py`          |

---

## 10. Configuration & Environment

| Setting                  | Where                                  | Responsible File                       |
| ------------------------ | -------------------------------------- | -------------------------------------- |
| `DEEPGRAM_API_KEY`       | `.env` file — TTS voice generation     | `.env`                                 |
| `GROQ_API_KEY`           | `.env` file — LLM for OCR cleanup      | `.env`                                 |
| `GROQ_MODEL`             | `.env` file — which Groq model to use  | `.env`                                 |
| Backend port (1233)      | `scripts/dev-all.sh` uvicorn command   | `scripts/dev-all.sh`                   |
| Remotion port (1235)     | `remotion/render-api.js` `RENDER_PORT` | `remotion/render-api.js` line 9        |
| Frontend port (1234)     | Next.js dev server                     | `scripts/dev-all.sh`                   |
| Start all services       | `npm run dev:all`                      | `scripts/dev-all.sh`                   |
| Topic → display name map | `TOPIC_MAP`                            | `backend/core/config.py`               |
| Grade style hints        | `GRADE_STYLE`                          | `backend/core/config.py`               |

---

## 11. Adding a New Grade or Curriculum

### How the routing works

Every child profile has two fields: `class_level` (integer) and `preferred_curriculum` (string).
When a video is requested, `router.py` receives both and dispatches to the matching builder.
The dispatch is a simple `if/elif` tree — one branch per curriculum, one sub-branch per grade inside it.

```
router.py  _dispatch(solve_result, grade, curriculum)
  │
  ├─ curriculum == "nctb"
  │     ├─ grade == 1  →  nctb/class_1.py  build()
  │     ├─ grade == 2  →  nctb/class_2.py  build()   ← add when ready
  │     └─ ...
  │
  ├─ curriculum == "cambridge"
  │     ├─ grade == 1  →  cambridge/class_1.py  build()   ← add when ready
  │     └─ ...
  │
  ├─ curriculum == "edexcel"
  │     ├─ grade == 1  →  edexcel/class_1.py  build()    ← add when ready
  │     └─ ...
  │
  └─ anything else  →  raises NotImplementedError  (pipeline returns video_url: null)
```

---

### Step-by-step: Adding NCTB Class 2

| Step | Action | File |
|---|---|---|
| 1 | Create `backend/video/narration/nctb/class_2.py` | New file |
| 2 | Inside it, define `build(solve_result) -> list[NarrationBeat]` — same pattern as `class_1.py` | `nctb/class_2.py` |
| 3 | Uncomment (or add) the `grade == 2` branch | `backend/video/narration/router.py` → `_dispatch()` |
| 4 | Set a child's `class_level = 2` in the app to test | `backend/api/routes/children.py` |

---

### Step-by-step: Adding Cambridge curriculum (Grades 1–5)

| Step | Action | File |
|---|---|---|
| 1 | Create folder `backend/video/narration/cambridge/` | New folder |
| 2 | Add `__init__.py` (empty) inside it | `cambridge/__init__.py` |
| 3 | Create `cambridge/class_1.py` with `build(solve_result) -> list[NarrationBeat]` | `cambridge/class_1.py` |
| 4 | Repeat for `class_2.py` through `class_5.py` as you build them out | `cambridge/class_{n}.py` |
| 5 | Add a `curriculum == "cambridge"` block to `_dispatch()` with a branch per grade | `backend/video/narration/router.py` |
| 6 | Add `"cambridge"` as an accepted value in the child profile | `backend/api/schemas.py` → `preferred_curriculum` field |

---

### Step-by-step: Adding EdExcel curriculum (Grades 1–5)

Identical to Cambridge above — replace `cambridge` with `edexcel` everywhere.

| Step | Action | File |
|---|---|---|
| 1 | Create folder `backend/video/narration/edexcel/` | New folder |
| 2 | Add `__init__.py` (empty) | `edexcel/__init__.py` |
| 3 | Create `edexcel/class_1.py` through `class_5.py` | `edexcel/class_{n}.py` |
| 4 | Add `curriculum == "edexcel"` block to `_dispatch()` | `backend/video/narration/router.py` |
| 5 | Add `"edexcel"` as accepted value | `backend/api/schemas.py` → `preferred_curriculum` field |

---

### What goes inside a narration builder file (any curriculum, any grade)

Every `class_N.py` must follow this structure — modelled on `nctb/class_1.py`:

| Section | What it does | Where in file |
|---|---|---|
| Module docstring | States curriculum, grade, age, pedagogy rules | Top of file |
| `ANIMATE_ITEM_TYPES` set | Items that get fly/wave animation vs fade | Constants section |
| `_detect_subtype()` | Reads `solve_result.topic`, question text → returns subtype string | Early in file |
| `_topic_function()` per topic | Returns `list[NarrationBeat]` for that topic+subtype | One function per topic |
| `_DISPATCH` dict | Maps `(topic, subtype)` → function | Bottom of file |
| `build(solve_result)` | Entry point: calls `_detect_subtype` then `_DISPATCH` | `build()` function |

**Pedagogy differences between curricula live entirely inside these files.**
Cambridge might use number lines from Grade 1; NCTB does not. EdExcel might use column arithmetic from Grade 2; NCTB waits until Grade 3. None of this affects any other layer.

---

### Adding a new scene type (needed for a higher grade or new curriculum)

| Step | Action | File |
|---|---|---|
| 1 | Decide the action string e.g. `"SHOW_NUMBER_LINE"` | — |
| 2 | Add it to `SceneAction` union type | `remotion/src/types.ts` |
| 3 | Create `remotion/src/components/Scenes/NewScene.tsx` | New file |
| 4 | Add `import` and render branch in `MathVideo.tsx` | `remotion/src/compositions/MathVideo.tsx` |
| 5 | If it groups (like SmallAdditionScene), add to the grouping block | `MathVideo.tsx` lines ~118–150 |
| 6 | Emit the action from the narration builder | Relevant `class_N.py` |

### Adding a new item icon (e.g. a rickshaw, a kite)

| Step | Action | File |
|---|---|---|
| 1 | Add SVG component + export | `remotion/src/assets/items/ItemSvgs.tsx` |
| 2 | Add the string key e.g. `"KITE_SVG"` to `ItemType` union | `remotion/src/types.ts` |
| 3 | Use `item_type="KITE_SVG"` in a `NarrationBeat` | Any `class_N.py` narration builder |
