import {
  ActivityRecord,
  ChildProfile,
  ExtractProblemResponse,
  RenderVideoResponse,
  SolveAndPromptResponse
} from "@/lib/types";
import { extractProblemInBrowser, normalizeExtractedQuestion } from "@/utils/browser-ocr";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:1233";
const DEFAULT_API_TIMEOUT_MS = 12000;

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
const API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || DEFAULT_API_TIMEOUT_MS);

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = isFormData
    ? { ...(init?.headers || {}) }
    : {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      };

  let res: Response;
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        `Request timed out after ${Math.ceil(API_TIMEOUT_MS / 1000)}s. Check backend is running at ${API_BASE_URL}.`,
        408,
        null
      );
    }
    throw new ApiError(
      `Cannot reach backend at ${API_BASE_URL}. Start backend: uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233`,
      0,
      error instanceof Error ? error.message : error
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg = typeof data === "object" && data !== null && "detail" in (data as Record<string, unknown>)
      ? String((data as Record<string, unknown>).detail)
      : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

export function toAbsoluteVideoUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

export type CreateChildPayload = {
  child_name: string;
  age: number;
  class_level: number;
  preferred_curriculum?: string;
  strict_class_level?: boolean;
};

export type PatchChildPayload = Partial<CreateChildPayload>;

export type SolveByChildPayload = {
  child_id: string;
  question: string;
};

export const api = {
  listChildren() {
    return request<ChildProfile[]>("/children");
  },

  getChild(childId: string) {
    return request<ChildProfile>(`/children/${childId}`);
  },

  createChild(payload: CreateChildPayload) {
    return request<ChildProfile>("/children", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  patchChild(childId: string, payload: PatchChildPayload) {
    return request<ChildProfile>(`/children/${childId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  solveAndVideoPromptByChild(payload: SolveByChildPayload) {
    return request<SolveAndPromptResponse>("/solve-and-video-prompt/by-child", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  renderVideo(video_prompt_json: Record<string, unknown>, outputName?: string) {
    return request<RenderVideoResponse>("/render-video", {
      method: "POST",
      body: JSON.stringify({
        video_prompt_json,
        output_name: outputName || `mymath-${Date.now()}.mp4`
      })
    });
  },

  async extractProblem(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const defaultGeometry = {
      analysis_available: false,
      has_diagram: false,
      line_segments: 0,
      circles: 0,
      parallel_pairs: 0,
      perpendicular_pairs: 0,
      point_labels: [],
      shape_hints: []
    };

    const sourceType: "image" | "pdf" =
      (file.type || "").toLowerCase() === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : "image";

    const shouldUseBrowserFallback = (parsed: ExtractProblemResponse) => {
      const q = (parsed.question || "").trim().toLowerCase();
      const isPlaceholder = q.includes("please type the math question from the image");
      const emptyQuestion = !q;
      const lowConfidence = Number(parsed.confidence || 0) <= 0.1;
      return sourceType === "image" && (emptyQuestion || isPlaceholder || lowConfidence);
    };

    try {
      const parsed = await request<ExtractProblemResponse>("/extract-problem", {
        method: "POST",
        body: formData
      });

      const normalizedQuestion = normalizeExtractedQuestion(parsed.question || "");
      const normalizedParsed: ExtractProblemResponse = normalizedQuestion
        ? { ...parsed, question: normalizedQuestion }
        : parsed;

      if (!shouldUseBrowserFallback(normalizedParsed)) {
        return normalizedParsed;
      }

      try {
        const local = await extractProblemInBrowser(file);
        return {
          ...normalizedParsed,
          question: local.question,
          extracted_text: local.rawText || normalizedParsed.extracted_text,
          ocr_engine: "browser+tesseract.js",
          confidence: Math.max(0.65, Number(normalizedParsed.confidence || 0)),
          notes: [...(normalizedParsed.notes || []), "Used browser OCR fallback to fill the question box."]
        };
      } catch {
        return normalizedParsed;
      }
    } catch (error) {
      try {
        const local = await extractProblemInBrowser(file);
        return {
          question: local.question,
          extracted_text: local.rawText,
          source_type: sourceType,
          ocr_engine: "browser+tesseract.js",
          confidence: 0.65,
          geometry: defaultGeometry,
          notes: ["Used browser OCR fallback because server extraction failed."]
        };
      } catch {
        throw error;
      }
    }
  },

  getActivity(childId: string, limit = 10) {
    const params = new URLSearchParams({ child_id: childId, limit: String(limit) });
    return request<ActivityRecord[]>(`/activity?${params.toString()}`);
  },

  getCoverage() {
    return request<unknown>("/coverage");
  },

  getAnalyticsSummary() {
    return request<unknown>("/analytics/summary");
  },

  async trySimilarFromBackend(childId: string, question: string): Promise<string | null> {
    try {
      const data = await request<{ question?: string }>("/try-similar/by-child", {
        method: "POST",
        body: JSON.stringify({ child_id: childId, question })
      });
      const q = data?.question?.trim();
      return q || null;
    } catch (error) {
      if (error instanceof ApiError && [404, 405].includes(error.status)) {
        return null;
      }
      throw error;
    }
  }
};
