# Curriculum PDF Ingestion Strategy

When feeding a new curriculum textbook PDF (e.g., NCTB, Cambridge, Edexcel) for any class into the system, the AI can drastically improve the mathematical scaffolding and contextual accuracy by reading and extracting the following properties directly from the source material:

## 1. What to Extract from the PDF

- **Exact Chapter/Topic Sequence:** The specific order of topics taught in that class.
- **Official Terminology and Examples:** The exact vocabulary and visual examples used by the local curriculum, ensuring the explanations feel familiar to the student.
- **Grade-Appropriate Language and Progression:** How complexity scales throughout the book, ensuring narrations and steps are suitable for the student's age group.
- **Real Exercise Patterns:** Format and structure of textbook problems to feed into the test bank and video prompts.

## 2. Deliverables Produced from PDF Ingestion

Once the PDF is provided, the ingestion process should yield the following four artifacts for the system:

1. **Clean Curriculum JSON:** A structured grouping of the curriculum down to the `class`, `topic`, and `subtopic` level.
2. **Topic Keywords & Mappings:** Search keywords mapped exactly to the wording found in the curriculum (e.g., mapping local terms for "addition" or "geometry shapes" to the solver engine's topics).
3. **Prioritized Solver Roadmap:** A list of solver functions and features that need to be implemented first based on the curriculum's core focus.
4. **Sample Question Banks:** Sets of math problems specifically aligned to each chapter for testing (evals) and practice.

## Recommendation for New Curriculums

To buildout the pipeline for a new curriculum, it is highly recommended to start by uploading **one class PDF first** (e.g., Class 3). This allows the ingestion pipeline to be quickly built, validated, and refined before processing the rest of the grade levels.
