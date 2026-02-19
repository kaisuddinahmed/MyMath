import { ChildMeta, StoredResult } from "@/lib/types";

const SELECTED_CHILD_ID_KEY = "mymath:selectedChildId";
const CHILD_META_KEY = "mymath:childMeta";
const LAST_RESULT_KEY = "mymath:lastResult";
const THEME_KEY = "mymath:theme";

type ChildMetaMap = Record<string, ChildMeta>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSelectedChildId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_CHILD_ID_KEY);
}

export function setSelectedChildId(childId: string | null) {
  if (typeof window === "undefined") return;
  if (!childId) {
    localStorage.removeItem(SELECTED_CHILD_ID_KEY);
    return;
  }
  localStorage.setItem(SELECTED_CHILD_ID_KEY, childId);
}

export function getChildMetaMap(): ChildMetaMap {
  return readJson<ChildMetaMap>(CHILD_META_KEY, {});
}

export function setChildMetaMap(map: ChildMetaMap) {
  writeJson(CHILD_META_KEY, map);
}

export function patchChildMeta(childId: string, patch: ChildMeta) {
  const map = getChildMetaMap();
  map[childId] = {
    ...(map[childId] || {}),
    ...patch
  };
  setChildMetaMap(map);
}

export function getLastResult(): StoredResult | null {
  return readJson<StoredResult | null>(LAST_RESULT_KEY, null);
}

export function setLastResult(result: StoredResult | null) {
  if (typeof window === "undefined") return;
  if (!result) {
    localStorage.removeItem(LAST_RESULT_KEY);
    return;
  }
  writeJson(LAST_RESULT_KEY, result);
}

export function getThemePreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const v = localStorage.getItem(THEME_KEY);
  return v === "dark" ? "dark" : "light";
}

export function setThemePreference(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
}
