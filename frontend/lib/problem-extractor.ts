export type ExtractProblemResult = {
  question: string;
  rawText: string;
};

function compactText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBestQuestion(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => compactText(line))
    .filter(Boolean);

  const scored = lines
    .map((line) => {
      let score = 0;
      if (/\d/.test(line)) score += 3;
      if (/[+\-xX*÷/=]/.test(line)) score += 3;
      if (/\b(of|area|perimeter|angle|fraction|triangle|circle|rectangle|sum|difference|product)\b/i.test(line)) score += 2;
      if (/\?/.test(line)) score += 1;
      if (line.length > 10 && line.length < 220) score += 1;
      return { line, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score >= 3) {
    return scored[0].line;
  }

  return compactText(raw).slice(0, 220);
}

function normalizeExtractedQuestion(question: string): string {
  const q0 = compactText(question || "");
  if (!q0) return "";

  let q = q0.replace(/^\s*\d{1,3}\s*[.)]\s*/, "");
  q = q.replace(/_{2,}|-{3,}|—{2,}/g, "?").trim();

  // Missing left operand: "? + 44 = 64", or OCR-lost variant "+ 44 64"
  let m = q.match(/^\?\s*([+\-])\s*(\d{1,6})\s*=\s*(\d{1,6})$/);
  if (m) {
    const op = m[1];
    const known = Number(m[2]);
    const total = Number(m[3]);
    return op === "+" ? `${total} - ${known}` : `${total} + ${known}`;
  }

  m = q.match(/^([+\-])\s*(\d{1,6})\s*(?:=|\s)\s*(\d{1,6})$/);
  if (m) {
    const op = m[1];
    const known = Number(m[2]);
    const total = Number(m[3]);
    return op === "+" ? `${total} - ${known}` : `${total} + ${known}`;
  }

  // Missing right operand: "44 + ? = 64" or "44 - ? = 20"
  m = q.match(/^(\d{1,6})\s*([+\-])\s*\?\s*=\s*(\d{1,6})$/);
  if (m) {
    const left = Number(m[1]);
    const op = m[2];
    const total = Number(m[3]);
    return op === "+" ? `${total} - ${left}` : `${left} - ${total}`;
  }

  m = q.match(/^(\d{1,6})\s*([+\-])\s*=\s*(\d{1,6})$/);
  if (m) {
    const left = Number(m[1]);
    const op = m[2];
    const total = Number(m[3]);
    return op === "+" ? `${total} - ${left}` : `${left} - ${total}`;
  }

  return q;
}

async function extractFromImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(file);
    return result.data?.text || "";
  } finally {
    await worker.terminate();
  }
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as {
    getDocument: (source: { data: Uint8Array; disableWorker: boolean }) => {
      promise: Promise<{ numPages: number; getPage: (pageNo: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }> }>;
    };
  };

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data, disableWorker: true });
  const pdf = await loadingTask.promise;

  const pagesToRead = Math.min(pdf.numPages, 4);
  const chunks: string[] = [];

  for (let pageNo = 1; pageNo <= pagesToRead; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (typeof item.str === "string" ? item.str : ""))
      .join(" ");
    chunks.push(pageText);
  }

  return chunks.join("\n");
}

export async function extractProblemFromFile(file: File): Promise<ExtractProblemResult> {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name);

  if (!isPdf && !isImage) {
    throw new Error("Please upload an image or PDF file.");
  }

  const rawText = isPdf ? await extractFromPdf(file) : await extractFromImage(file);
  const question = normalizeExtractedQuestion(pickBestQuestion(rawText));

  if (!question) {
    throw new Error("I could not read a math question from that file. Try a clearer photo or type it manually.");
  }

  return {
    question,
    rawText: compactText(rawText)
  };
}
