"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingOverlay from "@/components/loading-overlay";
import { api, toAbsoluteVideoUrl } from "@/lib/api";
import { getLastResult, getSelectedChildId, setLastResult } from "@/lib/storage";
import { ChildProfile, StoredResult } from "@/lib/types";

function normalizeQuestion(question: string): string {
  return question.replace(/×/g, "x").replace(/÷/g, "/").trim();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gradeRange(grade: number): number {
  if (grade <= 2) return 20;
  if (grade === 3) return 80;
  if (grade === 4) return 200;
  return 500;
}

function buildLocalSimilarQuestion(question: string, grade: number): string {
  const q = normalizeQuestion(question);

  const addSub = q.match(/^\s*(\d{1,4})\s*([+\-])\s*(\d{1,4})\s*$/);
  if (addSub) {
    const op = addSub[2];
    const max = gradeRange(grade);
    const a = randomInt(2, max);
    const b = randomInt(1, Math.max(2, Math.floor(max / 2)));
    if (op === "-") {
      const top = Math.max(a, b + randomInt(1, max));
      const bottom = Math.min(b, top - 1);
      return `${top} - ${bottom}`;
    }
    return `${a} + ${b}`;
  }

  const mulDiv = q.match(/^\s*(\d{1,4})\s*([xX*\/])\s*(\d{1,4})\s*$/);
  if (mulDiv) {
    const op = mulDiv[2];
    if (op === "/") {
      const divisor = randomInt(2, Math.min(12, 2 + grade * 2));
      const quotient = randomInt(2, Math.min(20, 4 + grade * 4));
      return `${divisor * quotient} / ${divisor}`;
    }
    const a = randomInt(2, Math.min(12, 2 + grade * 2));
    const b = randomInt(2, Math.min(12, 4 + grade * 2));
    return `${a} x ${b}`;
  }

  const fractionOf = q.match(/^\s*(\d+)\s*\/\s*(\d+)\s+of\s+(\d+)\s*$/i);
  if (fractionOf) {
    const denominator = randomInt(2, 8);
    const numerator = randomInt(1, denominator - 1);
    const unit = randomInt(2, 10);
    const total = denominator * unit;
    return `${numerator}/${denominator} of ${total}`;
  }

  return `${randomInt(2, 15)} + ${randomInt(2, 15)}`;
}

function getPractice(data: StoredResult | null): { question: string; answer: string } | null {
  const raw = data?.solve.video_prompt_json as
    | {
        practice_problem?: {
          question?: string;
          answer?: string;
        };
      }
    | undefined;

  if (!raw?.practice_problem?.question || !raw?.practice_problem?.answer) {
    return null;
  }

  return {
    question: raw.practice_problem.question,
    answer: raw.practice_problem.answer
  };
}

export default function ResultPage() {
  const router = useRouter();

  const [result, setResult] = useState<StoredResult | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [revealPractice, setRevealPractice] = useState(false);
  const [error, setError] = useState("");
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);

  useEffect(() => {
    const childId = getSelectedChildId();
    if (!childId) {
      router.replace("/child");
      return;
    }
    setSelectedChildId(childId);

    const cached = getLastResult();
    setResult(cached);
  }, [router]);

  useEffect(() => {
    if (!selectedChildId) return;
    api
      .getChild(selectedChildId)
      .then((child) => setSelectedChild(child))
      .catch(() => setSelectedChild(null));
  }, [selectedChildId]);

  const steps = useMemo(() => (result?.solve.verified_steps || []).slice(0, 3), [result]);
  const practice = useMemo(() => getPractice(result), [result]);
  const videoUrl = useMemo(() => {
    // V2: prefer video_url from solve response
    if (result?.solve.video_url) {
      return toAbsoluteVideoUrl(result.solve.video_url);
    }
    if (!result?.render?.output_url) return "";
    return toAbsoluteVideoUrl(result.render.output_url);
  }, [result]);

  async function trySimilar() {
    if (!result || !selectedChildId) return;

    setError("");
    setRevealPractice(false);
    setLoadingLabel("Thinking & making your video...");

    try {
      const backendSimilar = await api.trySimilarFromBackend(selectedChildId, result.question);
      const localSimilar = buildLocalSimilarQuestion(result.question, selectedChild?.class_level || 3);
      const nextQuestion = normalizeQuestion(backendSimilar || localSimilar);

      // V2: unified endpoint — solve + render in one call
      const solve = await api.solveAndRenderByChild({
        child_id: selectedChildId,
        question: nextQuestion
      });

      const render = solve.video_url
        ? {
            output_path: "",
            output_url: solve.video_url,
            duration_seconds: 0,
            used_template: solve.video_generated_by || "remotion",
            audio_generated: true,
          }
        : null;

      const updated: StoredResult = {
        childId: selectedChildId,
        question: nextQuestion,
        createdAt: new Date().toISOString(),
        solve,
        render
      };

      setResult(updated);
      setLastResult(updated);
      setLoadingLabel(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate a similar question.";
      setError(msg);
      setLoadingLabel(null);
    }
  }

  if (!result) {
    return (
      <main className="app-shell min-h-screen p-4 sm:p-6">
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-blue-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-slate-50">No Result Yet</h1>
          <p className="mt-2 text-base font-bold text-slate-700 dark:text-slate-200">Ask a question first to see your result and video.</p>
          <Link
            href="/child"
            className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-emerald-500 px-5 text-lg font-extrabold text-white"
          >
            Go to Child Home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell min-h-screen p-4 pb-10 sm:p-6">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header className="rounded-3xl border border-blue-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-200">Result</p>
              <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-slate-50">Great Work!</h1>
            </div>
            <Link
              href="/child"
              className="flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 px-4 py-2 text-base font-extrabold text-blue-900 dark:border-blue-900 dark:text-blue-100"
            >
              Ask Another
            </Link>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">Question: {result.question}</p>
        </header>

        <section className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Verified Answer</h2>
          <p className="mt-2 text-5xl font-extrabold text-emerald-600 dark:text-emerald-300">{result.solve.verified_answer}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Quick Steps</h2>
          <ul className="mt-3 space-y-2">
            {steps.map((step, i) => (
              <li key={`${step.title}-${i}`} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-base font-extrabold text-slate-900 dark:text-slate-50">{step.title}</p>
                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{step.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Video</h2>
          {videoUrl ? (
            <video
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-black dark:border-slate-700"
              controls
              playsInline
              preload="metadata"
              aria-label="Math explanation video"
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          ) : (
            <p className="mt-3 text-base font-bold text-rose-700 dark:text-rose-300">Video is not available for this result.</p>
          )}
        </section>

        <section className="rounded-3xl border border-amber-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Practice</h2>
          {practice ? (
            <>
              <p className="mt-2 text-lg font-extrabold text-slate-800 dark:text-slate-100">{practice.question}</p>
              <button
                className="mt-3 min-h-11 rounded-2xl bg-amber-500 px-4 py-2 text-base font-extrabold text-white"
                onClick={() => setRevealPractice((v) => !v)}
                aria-expanded={revealPractice}
                aria-label="Reveal practice answer"
              >
                {revealPractice ? "Hide Answer" : "Reveal Answer"}
              </button>
              {revealPractice ? (
                <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-lg font-extrabold text-amber-900 dark:bg-amber-900/35 dark:text-amber-100">
                  Answer: {practice.answer}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-base font-bold text-slate-700 dark:text-slate-200">No practice item available.</p>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-2xl bg-blue-600 px-5 text-lg font-extrabold text-white"
            onClick={trySimilar}
            aria-label="Try similar question"
          >
            Try Similar
          </button>
          <Link
            href="/child"
            className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-blue-200 px-5 text-lg font-extrabold text-blue-900 dark:border-blue-800 dark:text-blue-100"
          >
            Try Another Question
          </Link>
        </section>

        {error ? <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">{error}</p> : null}
      </section>

      <LoadingOverlay open={Boolean(loadingLabel)} label={loadingLabel || "Loading"} />
    </main>
  );
}
