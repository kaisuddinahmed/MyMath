"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChildCard from "@/components/child-card";
import LoadingOverlay from "@/components/loading-overlay";
import { api } from "@/lib/api";
import {
  getChildMetaMap,
  getSelectedChildId,
  setLastResult,
  setSelectedChildId
} from "@/lib/storage";
import { ActivityRecord, ChildMeta, ChildProfile, ChildView } from "@/lib/types";

function mergeChildren(children: ChildProfile[], metaMap: Record<string, ChildMeta>): ChildView[] {
  return children.map((child) => ({
    ...child,
    ...(metaMap[child.child_id] || {})
  }));
}

function normalizeQuestion(question: string): string {
  return question.replace(/×/g, "x").replace(/÷/g, "/").trim();
}

type InputMode = "type" | "upload" | null;

export default function ChildPage() {
  const router = useRouter();

  const [children, setChildren] = useState<ChildView[]>([]);
  const [selectedChildId, setSelectedChildIdState] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [question, setQuestion] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [attempts, setAttempts] = useState<ActivityRecord[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [error, setError] = useState("");
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  const selectedChild = useMemo(() => {
    if (!selectedChildId) return null;
    return children.find((c) => c.child_id === selectedChildId) || null;
  }, [children, selectedChildId]);

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    setError("");
    try {
      const serverChildren = await api.listChildren();
      const merged = mergeChildren(serverChildren, getChildMetaMap());
      setChildren(merged);

      const storedId = getSelectedChildId();
      if (storedId && merged.some((c) => c.child_id === storedId)) {
        setSelectedChildIdState(storedId);
      } else {
        setSelectedChildIdState(null);
        setSelectedChildId(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load child profiles";
      setError(msg);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  const loadAttempts = useCallback(async (childId: string) => {
    setLoadingAttempts(true);
    try {
      const recent = await api.getActivity(childId, 10);
      setAttempts(recent);
    } catch {
      setAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (!selectedChildId) {
      setAttempts([]);
      return;
    }
    loadAttempts(selectedChildId);
  }, [selectedChildId, loadAttempts]);

  function chooseChild(child: ChildView) {
    setSelectedChildIdState(child.child_id);
    setSelectedChildId(child.child_id);
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setUploadNote("");
    setLoadingLabel("Analyzing your file...");

    try {
      const extracted = await api.extractProblem(file);
      setQuestion(extracted.question);
      setInputMode("type");
      const shapeHints = extracted.geometry?.shape_hints || [];
      const shapeNote = shapeHints.length > 0 ? ` Geometry hints: ${shapeHints.join(", ")}.` : "";
      setUploadNote(
        `I found this question from ${file.name} (confidence ${Math.round(extracted.confidence * 100)}%).` +
          `${shapeNote} You can edit it before explaining.`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not read that file.";
      setError(msg);
    } finally {
      setLoadingLabel(null);
    }
  }

  async function handleExplain() {
    if (!selectedChildId) {
      setError("Please pick your profile first.");
      return;
    }

    const cleaned = normalizeQuestion(question);
    if (!cleaned) {
      setError("Enter a math question first.");
      return;
    }

    setError("");
    setLoadingLabel("Thinking...");

    try {
      const solve = await api.solveAndVideoPromptByChild({
        child_id: selectedChildId,
        question: cleaned
      });

      if (!solve.video_prompt_json) {
        throw new Error("I could not build a video plan for that question. Try a simpler one.");
      }

      setLoadingLabel("Making your video...");
      const render = await api.renderVideo(solve.video_prompt_json, `child-${selectedChildId}-${Date.now()}.mp4`);

      setLastResult({
        childId: selectedChildId,
        question: cleaned,
        createdAt: new Date().toISOString(),
        solve,
        render
      });

      setLoadingLabel(null);
      router.push("/result");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
      setLoadingLabel(null);
    }
  }

  return (
    <main className="app-shell min-h-screen p-4 pb-10 sm:p-6">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-200">Child</p>
              <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-slate-50">Math Time</h1>
            </div>
            <Link
              href="/"
              className="flex min-h-11 items-center justify-center rounded-2xl border border-emerald-200 px-4 py-2 text-base font-extrabold text-emerald-900 dark:border-emerald-900 dark:text-emerald-100"
            >
              Home
            </Link>
          </div>

          {selectedChild ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
              <span>Using profile:</span>
              <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-800">{selectedChild.child_name}</span>
              <button
                className="min-h-11 rounded-xl border border-emerald-300 px-3 py-2 text-sm font-extrabold dark:border-emerald-700"
                onClick={() => setSelectedChildIdState(null)}
                aria-label="Switch profile"
              >
                Switch Profile
              </button>
            </div>
          ) : (
            <p className="rounded-2xl bg-amber-50 px-3 py-3 text-sm font-bold text-amber-900 dark:bg-amber-900/35 dark:text-amber-100">
              Pick your profile to start.
            </p>
          )}
        </header>

        {loadingProfiles ? (
          <p className="rounded-2xl bg-white p-4 text-base font-bold text-slate-700 shadow-card dark:bg-slate-900 dark:text-slate-200">Loading profiles...</p>
        ) : null}

        {!loadingProfiles && children.length === 0 ? (
          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-3 text-base font-bold text-slate-700 dark:text-slate-200">No child profiles yet.</p>
            <Link
              href="/parent"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-lg font-extrabold text-white"
            >
              Ask Parent to Add Profile
            </Link>
          </section>
        ) : null}

        {!loadingProfiles && children.length > 0 && !selectedChild ? (
          <section className="space-y-3">
            <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Choose Your Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {children.map((child) => (
                <ChildCard key={child.child_id} child={child} onSelect={chooseChild} onEdit={() => undefined} compact />
              ))}
            </div>
          </section>
        ) : null}

        {selectedChild ? (
          <>
            <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-3 font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">How do you want to ask?</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`min-h-12 rounded-2xl px-4 text-lg font-extrabold ${
                    inputMode === "type"
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-emerald-200 text-emerald-900 dark:border-emerald-700 dark:text-emerald-100"
                  }`}
                  onClick={() => {
                    setInputMode("type");
                    setError("");
                  }}
                  aria-pressed={inputMode === "type"}
                >
                  Type a math question
                </button>

                <button
                  type="button"
                  className={`min-h-12 rounded-2xl px-4 text-lg font-extrabold ${
                    inputMode === "upload"
                      ? "bg-emerald-500 text-white"
                      : "border-2 border-emerald-200 text-emerald-900 dark:border-emerald-700 dark:text-emerald-100"
                  }`}
                  onClick={() => {
                    setInputMode("upload");
                    setError("");
                  }}
                  aria-pressed={inputMode === "upload"}
                >
                  Upload a math problem
                </button>
              </div>

              {inputMode === "upload" ? (
                <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
                  <p className="mb-3 text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    Upload image or PDF. I will read it and fill the question box for you.
                  </p>
                  <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-emerald-500 px-4 text-lg font-extrabold text-white">
                    Choose File
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                      aria-label="Upload image or PDF math problem"
                    />
                  </label>
                  <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Best results: clear photo, straight angle, high contrast. For geometry diagrams, include both diagram and text labels.
                  </p>
                </div>
              ) : null}

              {inputMode === "type" ? (
                <>
                  <label htmlFor="question" className="mb-2 mt-4 block text-lg font-extrabold text-slate-800 dark:text-slate-100">
                    Math question
                  </label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Example: Find the perimeter of a rectangle with length 8 cm and width 5 cm"
                    className="min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 text-lg dark:border-slate-700 dark:bg-slate-800"
                    aria-label="Math question"
                  />

                  {uploadNote ? (
                    <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
                      {uploadNote}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <button
                      className="min-h-12 w-full rounded-2xl bg-emerald-500 px-5 text-lg font-extrabold text-white disabled:opacity-60"
                      onClick={handleExplain}
                      disabled={Boolean(loadingLabel)}
                      aria-label="Explain with video"
                    >
                      Explain with Video
                    </button>
                  </div>
                </>
              ) : null}

              {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p> : null}
            </section>

            <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
              <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Last 10 Attempts</h2>

              {loadingAttempts ? <p className="mt-3 text-base font-bold text-slate-600 dark:text-slate-300">Loading attempts...</p> : null}
              {!loadingAttempts && attempts.length === 0 ? (
                <p className="mt-3 text-base font-bold text-slate-600 dark:text-slate-300">No attempts yet.</p>
              ) : null}

              {!loadingAttempts && attempts.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {attempts.map((item, index) => (
                    <li key={`${item.timestamp}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                      <p className="text-base font-extrabold text-slate-900 dark:text-slate-50">{item.question}</p>
                      <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                        Topic: {item.topic} - Score: {item.score}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        ) : null}
      </section>

      <LoadingOverlay open={Boolean(loadingLabel)} label={loadingLabel || "Loading"} />
    </main>
  );
}
