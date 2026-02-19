export type BrowserExtractResult = {
  question: string;
  rawText: string;
};

function scoreLineForMath(line: string): number {
  let score = 0;
  if (/\d/.test(line)) score += 3;
  if (/[+\-xX*/÷=]/.test(line)) score += 3;
  if (/\b(of|sum|difference|product|quotient|perimeter|area|fraction)\b/i.test(line)) score += 2;
  if (line.length > 5) score += 1;
  return score;
}

function inferQuestionFromText(text: string): string {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return "";

  const scored = lines
    .map((line) => ({ line, score: scoreLineForMath(line) }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 2).map((item) => item.line).join(" ");
  return normalizeExtractedQuestion(top || lines[0]);
}

function cleanupMathSpacing(text: string): string {
  let s = text;
  s = s.replace(/\s*([+=])\s*/g, " $1 ");
  s = s.replace(/\s*-\s*/g, " - ");
  s = s.replace(/\s*[xX×]\s*/g, " x ");
  s = s.replace(/\s*÷\s*/g, " / ");
  s = s.replace(/\s{2,}/g, " ");
  return s.trim();
}

export function normalizeExtractedQuestion(input: string): string {
  let s = (input || "")
    .replace(/\r/g, "\n")
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .trim();

  // Fix OCR joins like "of10", "Theproduct", "a)1,100".
  s = s.replace(/([A-Za-z])(\d)/g, "$1 $2");
  s = s.replace(/(\d)([A-Za-z])/g, "$1 $2");
  s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  s = s.replace(/([a-z])\)(\d)/gi, "$1) $2");

  s = cleanupMathSpacing(s);

  // Keep one blank marker when OCR drops underscores.
  s = s.replace(/_{2,}|-{4,}|—{2,}/g, "__");
  s = s.replace(/\s{2,}/g, " ");

  return s.trim();
}

async function runTesseractOcr(blob: Blob): Promise<string> {
  const tesseractModule = await import("tesseract.js");
  const recognize =
    (tesseractModule as unknown as { recognize?: (...args: unknown[]) => Promise<{ data?: { text?: string } }> }).recognize ||
    (tesseractModule as unknown as { default?: { recognize?: (...args: unknown[]) => Promise<{ data?: { text?: string } }> } }).default
      ?.recognize;

  if (!recognize) {
    throw new Error("Tesseract recognize() is not available.");
  }

  const result = await recognize(blob, "eng");
  return result?.data?.text || "";
}

async function pdfFirstPageAsPng(file: File): Promise<Blob | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = await file.arrayBuffer();
    const loadingTask = (pdfjs as unknown as { getDocument: (opts: Record<string, unknown>) => { promise: Promise<unknown> } }).getDocument({
      data,
      disableWorker: true
    });
    const doc = (await loadingTask.promise) as { getPage: (page: number) => Promise<unknown> };
    const page = (await doc.getPage(1)) as {
      getViewport: (opts: { scale: number }) => { width: number; height: number };
      render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
    };

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport }).promise;
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}

export async function extractProblemInBrowser(file: File): Promise<BrowserExtractResult> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  let rawText = "";
  if (isPdf) {
    const pageBlob = await pdfFirstPageAsPng(file);
    if (pageBlob) {
      rawText = await runTesseractOcr(pageBlob);
    }
  } else {
    rawText = await runTesseractOcr(file);
  }

  const normalizedText = normalizeExtractedQuestion(rawText);
  const question = inferQuestionFromText(normalizedText);

  return {
    question,
    rawText: normalizedText
  };
}
