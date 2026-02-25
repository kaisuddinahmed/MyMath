# NCTB Class 4 Mathematics: Context & Logic Definitions

## 1. Curriculum Overview
**Source:** NCTB Class 4 Elementary Mathematics (Revised 2026).
**Key Shifts from Class 3:**
1.  **Numbers:** Introduction of Crores (National) and Millions (International).
2.  **Arithmetic:** Order of Operations (Mathematical Sentences) using (), +, -, ×, ÷.
3.  **New Core Topics:** LCM/HCF, Fractions (Proper/Mixed), and Decimal Fractions (Tenths/Hundredths).

### Topic Registry & Logic Mappings
| Topic | Input Pattern | Solver Logic Requirement |
| :--- | :--- | :--- |
| **Number Systems** | "2,10,46,091" vs "21,046,091" | **Logic:** `FormatSystem`. Convert commas based on National vs International rules. |
| **Math Sentences** | "$(28+11)\div3\ne15$" or "$x + 8 = 21$" | **Logic:** `BODMAS_Lite`. Priority: 1. Parentheses `()`, 2. Div/Mul `÷/×`, 3. Add/Sub `+/-`. Solve open variables $\square$. |
| **Multiples/Factors** | "Find LCM of 8 and 12" | **Logic:** `LCM(a,b)` & `HCF(a,b)`. **Explain:** Show list of multiples (8, 16, 24...) and factors. |
| **Common Fractions** | "$1/4 + 2/4$" or "Mixed Fraction" | **Logic:** `FractionAdd(a/c, b/c)`. **Scope:** Addition/Subtraction strictly with the SAME denominator. |
| **Decimal Fractions** | "$0.3 + 0.4$" or "$1.2 - 0.8$" | **Logic:** `DecSum` / `DecDiff`. **Explain:** Emphasize aligning the decimal point vertically. |
| **Time (Measurement)**| "15:00 to 12-hour clock" | **Logic:** `TimeConvert`. Map 24-hr to 12-hr format (e.g., $15:00 \to 3:00$ PM). |
| **Geometry** | Image of an Angle or Triangle | **Logic:** `AngleClassify`: Acute ($<90^\circ$), Right ($=90^\circ$), Obtuse ($>90^\circ$). |
| **Data** | Image of a Bar Graph | **Logic:** Extract X/Y axis values. Output JSON key-value pairs of the plotted data. |

---

## 2. Visual & OCR Handling Guidelines
The app must interpret Class 4 metaphors when processing user uploads.

### Common Visual Metaphors
1.  **Math Sentences (Open Boxes):**
    * Empty squares $\square$ or blanks represent the unknown variable ($x$).
2.  **Fractions:**
    * **Visual:** Number lines marking intervals between 0 and 1 (e.g., $0 \to 1/10 \to 2/10 \to 1$).
    * **Shaded Shapes:** Rectangles/Circles partitioned into equal pieces.
3.  **Decimals:**
    * Often visualized using a grid of 10 blocks ($0.1$) or 100 blocks ($0.01$).
4.  **Geometry Tools:**
    * **Protractor (Chanda):** Semi-circle tool used to measure angles. If an image contains a protractor, the logic must read the degree line it points to.
5.  **Data (Bar Graphs):**
    * Vertical or horizontal bars with grid lines. OCR must detect the scale interval on the Y-axis (e.g., increments of 5, 10, or 20).

---

## 3. Solver "Explain-Like-I'm-10" Guidelines

### Explanation Templates

* **Mathematical Sentences (BODMAS):**
    > **Problem:** $7 + 3 \times 6 = ?$
    > "In math, multiplication happens before addition.
    > First, multiply: $3 \times 6 = 18$.
    > Then, add: $7 + 18 = 25$."

* **LCM (Lowest Common Multiple):**
    > **Problem:** LCM of 4 and 6.
    > "Multiples of 4: 4, 8, 12, 16, 20, 24...
    > Multiples of 6: 6, 12, 18, 24...
    > The smallest number in both lists is 12. So, LCM is 12."

* **Decimal Addition:**
    > **Problem:** $1.3 + 2.8$
    > "Line up the decimal points.
    > Add the tenths: $3 + 8 = 11$. Write 1, carry 1 to the ones.
    > Add the ones: $1 + 2 + 1 (carry) = 4$.
    > Answer: 4.1"

* **Angle Classification:**
    > **Problem:**     > "This angle measures $45^\circ$. Because it is smaller than $90^\circ$ (a right angle), it is an Acute Angle."

---

## 4. Edge Cases & Constraints
* **Fractions:** Addition/Subtraction in Class 4 ONLY involves fractions with the **same denominator**. Cross-multiplication (different denominators) is a Class 5 topic.
* **Negative Numbers:** STILL PROHIBITED.
* **Algebra:** Do not use $x$ or $y$ in explanations. Use "Empty Box" ($\square$) or "Unknown".