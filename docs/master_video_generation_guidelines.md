# Master Video Generation Guidelines (Remotion Engine)

## General Rules for the LLM:

- **No Characters:** Do not use humans or animals. Rely on geometric shapes, SVGs (like apples or stars), emojis, and typography.
- **Animation Tools:** Specify Remotion primitives: `spring()` for bouncy entrances, `interpolate()` for smooth sliding/fading, and `<Sequence>` for hard cuts.
- **Grid Systems:** Always align multi-digit math in strict CSS flex/grid columns (Ones under Ones, Tens under Tens).
- **Audio Sync:** Ensure voiceover (VO) text maps perfectly to the visual timeline (e.g., "Write the zero [Visual: 0 drops in], carry the one [Visual: 1 floats up]").

---

## Class 1 (Ages 6-7): Concrete & Visual

**Tone:** Enthusiastic, slow-paced, visually magical.

- **Number Sense (Counting & Comparisons):**
  - _Visuals:_ Use distinct, bright SVGs popping onto the screen one by one.
  - _Animation:_ `spring()` scaling from 0 to 1. Sync a pop sound to each appearance.
  - _Example:_

- **Core Arithmetic (Basic Add/Sub):**
  - _Visuals:_ Horizontal layout. Two groups of objects.
  - _Animation:_ `interpolate()` to slide groups horizontally to the center to merge (Addition) or shrink/fade items to disappear (Subtraction). The equation string dynamically updates below them.

- **Geometry & Patterns:**
  - _Visuals:_ Solid 2D shapes (Circle, Triangle).
  - _Animation:_ Shapes morph or flip to reveal the next item in a pattern sequence.

---

## Class 2 (Ages 7-8): Transition to Algorithms

**Tone:** Encouraging, step-by-step, algorithm-focused.

- **Number Properties (Even/Odd):**
  - _Visuals:_ Objects arranging themselves in rows of two.
  - _Animation:_ If an object is left alone without a partner, highlight it in red and pulse the word "Odd" (Bijor).

- **Core Arithmetic (Vertical Stack & Carry/Borrow):**
  - _Visuals:_ Vertical grid layout. Use a soft background highlight box for the active column.
  - _Animation:_ Numbers split apart. For "Carrying", the tens digit floats up and over to the next column. For "Borrowing", a 10-block slides over and shatters into 10 ones.

- **Multiplication & Division (Concept):**
  - _Visuals:_ Grids or arrays (e.g., 3 rows of 4 stars).
  - _Animation:_ Highlight row by row, converting the visual grid into the equation 3 x 4 = 12.

---

## Class 3 (Ages 8-9): Abstract & Multi-Step

**Tone:** Clear, logical, instructional.

- **Large Numbers (Place Value):**
  - _Visuals:_ Place value charts (O, T, H, Th, Ayut, Lakh).
  - _Animation:_ Digits slide into their respective columns. Place value commas pop in with a specific sound effect to emphasize national formatting.

- **Advanced Operations (Long Multiplication/Division):**
  - _Visuals:_ Step-by-step vertical solvers.
  - _Animation:_ Dim the numbers not currently being multiplied. For division, animate the "drop down" arrow when bringing the next digit down into the active row.

- **Fractions (Introduction):**
  - _Visuals:_ A circle or rectangle.
  - _Animation:_ A line slices the shape. Sections fill with color to represent the numerator.

---

## Class 4 (Ages 9-10): Rules & Relationships

**Tone:** Analytical, focused on rules and priorities.

- **Mathematical Sentences (BODMAS - Basic):**
  - _Visuals:_ A full horizontal equation.
  - _Animation:_ A glowing bracket surrounds the active operation (e.g., the division part). The surrounding numbers blur. The active part shrinks into its solved answer, and the rest of the equation snaps together to close the gap.

- **Multiples, Factors (LCM/HCF):**
  - _Visuals:_ Two horizontal lists of numbers growing side-by-side.
  - _Animation:_ The numbers that appear in _both_ lists light up (pulse). The smallest one (for LCM) or largest one (for HCF) scales up by 1.5x and turns green.

- **Decimals:**
  - _Visuals:_ Vertical addition/subtraction.
  - _Animation:_ A bright red vertical line drops down through the decimal points to force visual alignment _before_ the numbers are allowed to be added.

---

## Class 5 (Ages 10-11): Advanced Application

**Tone:** Academic, precise, real-world connected.

- **Full BODMAS (Nested Brackets):**
  - _Visuals:_ Equations with `()`, `{}`, and `[]`.
  - _Animation:_ A camera zoom effect (using scale) pushes in on the innermost round brackets `()`. Once solved, the camera zooms out slightly to the curly brackets `{}`, reinforcing the "inside-out" solving priority.

- **Fractions & Decimals (Advanced):**
  - _Visuals:_ Fraction mixed-number conversion.
  - _Animation:_ The denominator swoops around to multiply with the whole number, then adds to the numerator, visualizing the _(Whole x Denominator) + Numerator_ rule.

- **Percentage & Average:**
  - _Visuals:_ A 10 x 10 grid (100 squares).
  - _Animation:_ Squares quickly fill up with color to represent the percentage. For average, show unequal stacks of blocks melting and leveling out to become perfectly flat equal stacks.

- **Geometry:**
  - _Visuals:_ Clean, precise SVG lines and protractors.
  - _Animation:_ Highlight specific angles or parallel lines. Transform a parallelogram by slicing off a triangle from one end and moving it to the other to prove it has the same area as a rectangle.
