# NCTB Class 5 Mathematics: Context & Logic Definitions

## 1. Curriculum Overview
**Source:** NCTB Class 5 Elementary Mathematics.
**Key Shifts from Class 4:**
1.  **BODMAS:** Introduction of nested brackets `()`, `{}`, `[]`.
2.  **Fractions & Decimals:** Full arithmetic operations (including division of decimals by decimals).
3.  **New Core Topics:** Percentage (Profit/Loss/Interest) and Average.
4.  **Geometry:** Classification of Quadrilaterals and Circle components.

### Topic Registry & Logic Mappings
| Topic | Input Pattern | Solver Logic Requirement |
| :--- | :--- | :--- |
| **Math Sentences** | `[ 5 + { 3 × (4 - 2) } ]` | **Logic:** `BODMAS_Full`. Execute innermost `()` first, then `{}`, then `[]`. |
| **LCM / HCF** | "Bells ring together" or "Cut longest ribbon" | **Logic:** Word problem parser. "Together/Minimum" $\to$ `LCM`. "Maximum/Longest" $\to$ `HCF`. |
| **Fractions** | `2 1/3 + 1 1/4` (Mixed) | **Logic:** 1. Convert to improper $\to$ 2. Find LCM of denominators $\to$ 3. Add $\to$ 4. Simplify. |
| **Decimals** | `2.8 × 1.75` or `4.5 ÷ 1.5` | **Logic:** `DecimalMath`. **Rule:** When dividing, multiply both divisor and dividend by 10/100 to make the divisor a whole number. |
| **Average** | "Runs scored in 5 matches..." | **Logic:** `Average = Sum of quantities / Number of quantities`. |
| **Percentage** | "15% of 300" or "Profit of 20%" | **Logic:** Replace `%` with `/100`. Profit = Sale Price - Cost Price. |
| **Measurement** | "Area of triangle: base 5, height 4" | **Logic:** Triangle Area = `(Base × Height) ÷ 2`. Rectangle = `Length × Width`. |
| **Geometry** | Image of a shape or circle. | **Logic:** Identify Rhombus (4 equal sides, no right angle), Trapezium (1 pair parallel sides). Identify Circle radius, diameter ($d=2r$), chord. |
| **Data** | List of raw numbers (e.g., marks) | **Logic:** Generate Frequency Table with specified `Class Interval`. |

---

## 2. Visual & OCR Handling Guidelines

### Common Visual Metaphors
1.  **Nested Brackets:** OCR must carefully distinguish between `( )`, `{ }`, and `[ ]`.
2.  **Fractions:** Often written vertically $\frac{a}{b}$ or as mixed fractions $x \frac{a}{b}$. OCR must parse the whole number separately from the numerator/denominator.
3.  **Geometry Diagrams:**
    * **Quadrilaterals:** Look for parallel line markers (small arrows on lines) or right-angle square markers.
    * **Circles:** A line passing through the center is the **Diameter**. A line from center to edge is **Radius**. Any other line connecting two points is a **Chord**.
4.  **Data (Histograms):** Bar graphs where the bars touch each other. OCR must read the X-axis intervals (e.g., 20-29, 30-39).

---

## 3. Solver "Explain-Like-I'm-11" Guidelines

### Explanation Templates

* **Mixed Fraction Addition:**
    > **Problem:** $1\frac{1}{2} + \frac{1}{4}$
    > "First, turn the mixed fraction into an improper fraction: $1\frac{1}{2} = \frac{3}{2}$.
    > Next, find the common denominator for 2 and 4, which is 4.
    > $\frac{3}{2}$ becomes $\frac{6}{4}$. Now add: $\frac{6}{4} + \frac{1}{4} = \frac{7}{4}$."

* **Decimal Division (e.g., $4.5 \div 1.5$):**
    > "We want to make the divisor a whole number. 
    > Multiply both numbers by 10 to move the decimal point.
    > The problem becomes $45 \div 15$.
    > $45 \div 15 = 3$."

* **Average:**
    > "To find the average, first find the total.
    > Total sum = ...
    > Now divide the total by the number of items (...).
    > Average = ..."

* **Percentage:**
    > **Problem:** 20% of 50.
    > "20% means 20 out of 100, or $\frac{20}{100}$.
    > So, $\frac{20}{100} \times 50 = 10$."

* **Geometry (Rhombus vs Square):**
    > "Both have 4 equal sides. But look at the corners! A square stands straight up with $90^\circ$ angles. A rhombus is slanted, so its angles are not $90^\circ$."

---

## 4. Edge Cases & Constraints
* **Decimals:** Avoid infinite repeating decimals. Round to 2 or 3 decimal places if necessary.
* **Percentage:** If calculating Profit/Loss, it is ALWAYS calculated on the **Cost Price**.
* **Algebra:** Formal variables ($x, y$) are still generally avoided in favor of "Blank Boxes" or written descriptions.