# Instructions for Claude — MyMath Narration & Scene Finetuning

I have two folders mounted:
- `narration/` — Python narration builders (`nctb/class_1.py`, `base.py`, `router.py`)
- `src/` — Remotion scene components (`components/Scenes/`, `components/Engines/`, `compositions/MathVideo.tsx`)

Read `narration/CONTEXT.md` first for full project context before making any changes.

## How it works:

- `narration/nctb/class_1.py` controls what the child hears (`text=`) and which visual scene plays (`action=`) for every Class 1 topic
- Each `action` maps to a `.tsx` file in `src/components/Scenes/`
- Three consecutive `SHOW_SMALL_ADDITION` beats group into one `SmallAdditionScene` — timing of each phase is driven by TTS audio length
- `src/components/Engines/ObjectArray.tsx` controls item pop-in, gap, merge animation
- `src/compositions/MathVideo.tsx` is the master compositor — routes actions to scenes, places audio, controls padding

## What I want to finetune:

[describe what's wrong — e.g. "the addition scene shows all items at once instead of 3 then 2", "the narration for subtraction is too fast", "the equation appears too early"]
