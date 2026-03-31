# Vision: Dynamic Choreography Engine

## The Current Bottleneck

MyMath currently relies on a **Template-Based Architecture**. The backend LLM classifies a math problem and selects a high-level action (e.g., `SHOW_SMALL_SUBTRACTION`). The Remotion frontend then intercepts this action and passes it to a hardcoded, manually built React component (e.g., `SmallSubtractionScene.tsx` or `StorySubtractionScene.tsx`).

While this guarantees highly polished output, it inherently limits the system to scenarios that developers have manually programmed. If a math problem involves frogs jumping into a pond, the system cannot generate it unless a developer writes a `FrogPondScene.tsx`.

## The Vision: LLM as the Video Director

The future of MyMath lies in a entirely **Data-Driven Choreography Architecture**. The goal is to eliminate manual scene creation. The LLM will no longer output vague actions like `SHOW_SMALL_SUBTRACTION`. Instead, it will output a comprehensive `ChoreographyScript` JSON payload describing exactly **what** appears on screen and **when**.

### 1. The Universal Stage

The Remotion frontend will be reduced to a single, generic `ChoreographyScene.tsx` component playing the role of a "Universal Stage."
This stage does not know or care if the problem is about birds, apples, or fractions. It blindly reads the JSON payload, checks an SVG library for the requested `Actor` objects, and executes math formulas to animate them at exactly the requested timestamps.

### 2. Scene Formulation via LLM

For every problem, the Groq LLM will:

1. Read the parsed math logic (e.g. 5 - 1 = 4).
2. Scan the semantic context (e.g. "5 birds sitting on a tree, 1 flew away").
3. Generate the `ChoreographyScript` JSON:
   - Setting `environment` to `"TREE_BRANCH"`.
   - Creating 5 `actors` of type `"BIRD_SVG"`.
   - Determining the X/Y coordinates to space them evenly.
   - Scripting a `"FLY_AWAY_ARC"` event for bird #5 at the precise frame matching the generated Deepgram audio.

With this architecture, the system can instantly generate millions of unique, story-driven animated scenes across the entire curriculum without any frontend code changes.

## Continuous Learning via RLHF

Because the video generation is entirely JSON-driven, the videos themselves become structural data points. This unlocks **Reinforcement Learning from Human Feedback (RLHF)**.

1. **Feedback Loops:** The user-facing app will feature `Like` / `Dislike` / `Skip` metrics for every video watched.
2. **Actionable Analytics:** If a user "dislikes" a video where birds flew away too fast, or where 15 apples cluttered the screen, that negative feedback is tied directly to the `ChoreographyScript` JSON factors (speed parameters, object density limits).
3. **Self-Optimizing LLM:** The database of successful (Liked) vs unsuccessful (Disliked) JSON scripts is routinely fed back into the Groq LLM's dataset or prompt context. The engine will autonomously learn that:
   - "Children prefer slower counting animations."
   - "Children skip videos that take longer than 10 seconds to show the equation."
   - "Bluey-style environments perform better than plain backgrounds."

By treating video frames as structured data, MyMath transforms from a static template engine into an evolving, AI-directed educational platform that continuously molds its pedagogy and aesthetics to optimize child engagement.
