# Video Generation and Backend Solution Flow

This document outlines the backend flow from receiving a math problem to generating a final video, along with the main files responsible for video generation logic.

## 1. Key Files Responsible for Video Generation

The video generation and mathematical solution flow in the application is orchestrated across a few key modules:

### A. Python/MoviePy Renderer (`backend/video_engine/`)

- **`renderer.py`**: Handles the actual generation of the video using Python. It uses `moviepy` to stitch clips together, `PIL` (Pillow) to draw the frames, and text-to-speech engines (`pyttsx3`/`aifc`) for generating the audio narration.
- **`templates/`** (e.g., `counters.py`, `fraction.py`, `groups.py`): Define the visual layouts and rendering code specific to different math topics and visual metaphors.

### B. React-Based Renderer (`remotion/` directory)

- This folder contains a completely separate, web-technology-based video creation setup using the Remotion framework.

### C. The Coordinator API (`backend/api/routes/solve.py`)

- Functions as the director that coordinates the entire flow between generating a math solution and building the "script" that either `renderer.py` or `remotion` turns into a video.

---

## 2. The Backend Flow (From Math Problem to Video)

The entire flow from a problem to an MP4 video occurs in three main steps:

### Step A: Solving the Math Problem

1. **API Invocation:** A request hits the endpoints inside `backend/api/routes/solve.py` (e.g., `/solve-and-render` or `/solve-and-video-prompt`).
2. **Computational Solution:** It delegates the core logic to `engine_solve()` inside `backend/math_engine/engine.py`.
3. **Problem Classification:** The Math Engine determines the correct topic (e.g., small addition, fractions, comparisons), solves the problem to get the verified answer, and records the step-by-step logic.

### Step B: Directing the Video Script

1. **Topic Guidance Generation:** Once the math engine computes the answer, `solve.py` calls an internal function `_build_topic_guidance()`.
2. **Pedagogical Rules:** This function attaches highly specific pedagogical rules based on the topic. For instance:
   - If summing numbers <= 20, it enforces a 4-scene storyboard rule.
   - If performing column arithmetic > 20, it enforces sequential scene creation for each column.
3. **Director LLM Prompting:** This topic guidance, along with the math solution and curriculum rules (e.g., NCTB culturally relevant objects, tone, max duration), is sent to an LLM acting as the "Video Director".
4. **Script Creation:** The LLM generates a strict JSON Director Script containing scenes. Each scene designates a specific action (e.g., `ADD_ITEMS`, `SHOW_EQUATION`), narration text, and styling metadata.
5. **Validation:** The JSON script is validated via `validate_video_prompt()` to ensure constraints (like checking the schema validity, verifying the correct answer is present, and keeping the storyboard logic cohesive) are met before rendering.

### Step C: Rendering the Video

Once a valid JSON Director Script is obtained, the framework executes it using either the Python or React-based render strategy:

**Using Python (`renderer.py`):**

- **Narration Synthesis:** The text narration strings from the JSON script are converted into `.aiff` or `.wav` audio clips using Text-to-Speech (`pyttsx3`).
- **Frame Generation:** Pillow (`PIL`) loops through the scenes to draw each storyboard frame for actions like grouping items, splitting pies, or showing equations.
- **Assembly:** `moviepy` sequences these scenes, attaches the generated audio, sets frame durations based on the pacing/duration rules, and exports the final `.mp4` video.

**Using Remotion (`remotion/`):**

- The scene JSON is passed to the React server which programmatically animates DOM components in a headless browser and encodes those frames into a video recording.
