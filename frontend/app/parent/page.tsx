"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChildCard from "@/components/child-card";
import SettingsDrawer from "@/components/settings-drawer";
import { API_BASE_URL, ApiError, api } from "@/lib/api";
import {
  getChildMetaMap,
  getThemePreference,
  patchChildMeta,
  setSelectedChildId,
  setThemePreference
} from "@/lib/storage";
import { ChildMeta, ChildProfile, ChildView } from "@/lib/types";

type ChildFormState = {
  child_name: string;
  age: string;
  class_level: string;
  preferred_curriculum: string;
  strict_class_level: boolean;
};

const CREATE_DEFAULT: ChildFormState = {
  child_name: "",
  age: "8",
  class_level: "3",
  preferred_curriculum: "",
  strict_class_level: false
};

const CURRICULUM_OPTIONS = ["NCTB", "Cambridge", "Edexcel"] as const;
const AGE_OPTIONS = ["4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

function normalizeCurriculum(value: string | null | undefined): string {
  const cleaned = (value || "").trim();
  if (!cleaned) return "";
  const matched = CURRICULUM_OPTIONS.find((option) => option.toLowerCase() === cleaned.toLowerCase());
  return matched || "";
}

function normalizeAge(value: string | number | null | undefined): string {
  const age = Number(value);
  if (Number.isFinite(age) && age >= 4 && age <= 12) {
    return String(Math.round(age));
  }
  return CREATE_DEFAULT.age;
}

function mergeChildren(children: ChildProfile[], metaMap: Record<string, ChildMeta>): ChildView[] {
  return children.map((child) => ({
    ...child,
    ...(metaMap[child.child_id] || {})
  }));
}

export default function ParentPage() {
  const router = useRouter();

  const [children, setChildren] = useState<ChildView[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [form, setForm] = useState<ChildFormState>(CREATE_DEFAULT);

  const [editing, setEditing] = useState<ChildView | null>(null);
  const [editForm, setEditForm] = useState<ChildFormState>(CREATE_DEFAULT);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profiles] = await Promise.all([api.listChildren()]);
      const metaMap = getChildMetaMap();
      setChildren(mergeChildren(profiles, metaMap));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load children";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    const pref = getThemePreference();
    const enabled = pref === "dark";
    setDarkMode(enabled);
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  function handleDarkModeToggle(enabled: boolean) {
    setDarkMode(enabled);
    setThemePreference(enabled ? "dark" : "light");
    document.documentElement.classList.toggle("dark", enabled);
  }

  function updateCreateForm<K extends keyof ChildFormState>(key: K, value: ChildFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEditForm<K extends keyof ChildFormState>(key: K, value: ChildFormState[K]) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCreate(true);
    setMessage("");
    setError("");

    const age = Number(form.age);
    const classLevel = Number(form.class_level);

    if (!form.child_name.trim()) {
      setError("Please enter a child name.");
      setSavingCreate(false);
      return;
    }

    if (!Number.isFinite(age) || age < 4 || age > 12) {
      setError("Age should be between 4 and 12.");
      setSavingCreate(false);
      return;
    }

    if (!Number.isFinite(classLevel) || classLevel < 1 || classLevel > 5) {
      setError("Class level should be 1 to 5.");
      setSavingCreate(false);
      return;
    }

    try {
      const created = await api.createChild({
        child_name: form.child_name.trim(),
        age,
        class_level: classLevel,
        preferred_curriculum: form.preferred_curriculum.trim() || undefined,
        strict_class_level: form.strict_class_level
      });

      patchChildMeta(created.child_id, {
        preferred_curriculum: form.preferred_curriculum.trim() || undefined,
        strict_class_level: form.strict_class_level
      });

      setForm(CREATE_DEFAULT);
      setMessage("Child profile created.");
      await loadChildren();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create child profile";
      setError(msg);
    } finally {
      setSavingCreate(false);
    }
  }

  function startEdit(child: ChildView) {
    setEditing(child);
    setEditForm({
      child_name: child.child_name,
      age: normalizeAge(child.age),
      class_level: String(child.class_level),
      preferred_curriculum: normalizeCurriculum(child.preferred_curriculum),
      strict_class_level: Boolean(child.strict_class_level)
    });
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    setSavingEdit(true);
    setError("");
    setMessage("");

    const age = Number(editForm.age);
    const classLevel = Number(editForm.class_level);

    if (!editForm.child_name.trim()) {
      setError("Please enter a child name.");
      setSavingEdit(false);
      return;
    }

    if (!Number.isFinite(age) || age < 4 || age > 12) {
      setError("Age should be between 4 and 12.");
      setSavingEdit(false);
      return;
    }

    if (!Number.isFinite(classLevel) || classLevel < 1 || classLevel > 5) {
      setError("Class level should be 1 to 5.");
      setSavingEdit(false);
      return;
    }

    const payload = {
      child_name: editForm.child_name.trim(),
      age,
      class_level: classLevel,
      preferred_curriculum: editForm.preferred_curriculum.trim() || undefined,
      strict_class_level: editForm.strict_class_level
    };

    let backendUpdated = true;

    try {
      await api.patchChild(editing.child_id, payload);
    } catch (e) {
      if (e instanceof ApiError && [404, 405].includes(e.status)) {
        backendUpdated = false;
      } else {
        const msg = e instanceof Error ? e.message : "Could not update profile";
        setError(msg);
        setSavingEdit(false);
        return;
      }
    }

    patchChildMeta(editing.child_id, {
      child_name: payload.child_name,
      age: payload.age,
      class_level: payload.class_level,
      preferred_curriculum: payload.preferred_curriculum,
      strict_class_level: payload.strict_class_level
    });

    await loadChildren();
    setEditing(null);
    setSavingEdit(false);
    setMessage(
      backendUpdated
        ? "Profile updated."
        : "Profile saved on this device. Backend edit API is not available in this backend version."
    );
  }

  function chooseChild(child: ChildView) {
    setSelectedChildId(child.child_id);
    router.push("/child");
  }

  const hasChildren = useMemo(() => children.length > 0, [children]);

  return (
    <main className="app-shell min-h-screen p-4 pb-10 sm:p-6">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <header className="rounded-3xl border border-blue-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-blue-700 dark:text-blue-200">Parent</p>
              <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-slate-50">Child Profiles</h1>
            </div>
            <button
              className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base font-extrabold text-slate-800 dark:border-slate-700 dark:text-slate-200"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
            >
              Settings
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/"
              className="flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 px-4 py-2 text-base font-extrabold text-blue-900 dark:border-blue-900 dark:text-blue-100"
            >
              Back to Home
            </Link>
            <Link
              href="/child"
              className="flex min-h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2 text-base font-extrabold text-white"
            >
              Go to Child Mode
            </Link>
          </div>
        </header>

        <form
          onSubmit={handleCreateChild}
          className="rounded-3xl border border-blue-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900"
          aria-label="Create child profile"
        >
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Create Child</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              Name
              <input
                className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                value={form.child_name}
                onChange={(e) => updateCreateForm("child_name", e.target.value)}
                required
                aria-label="Child name"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              Age (4-12)
              <select
                className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                value={form.age}
                onChange={(e) => updateCreateForm("age", e.target.value)}
                aria-label="Child age"
              >
                {AGE_OPTIONS.map((ageOption) => (
                  <option key={ageOption} value={ageOption}>
                    {ageOption}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              Class Level (1-5)
              <select
                className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                value={form.class_level}
                onChange={(e) => updateCreateForm("class_level", e.target.value)}
                aria-label="Class level"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
              Preferred Curriculum (optional)
              <select
                className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                value={form.preferred_curriculum}
                onChange={(e) => updateCreateForm("preferred_curriculum", e.target.value)}
                aria-label="Preferred curriculum"
              >
                <option value="">No preference</option>
                {CURRICULUM_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 flex min-h-11 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2 text-base font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.strict_class_level}
              onChange={(e) => updateCreateForm("strict_class_level", e.target.checked)}
              className="h-5 w-5"
              aria-label="Strict class level"
            />
            Strict class level
          </label>

          <button
            type="submit"
            className="mt-4 min-h-12 w-full rounded-2xl bg-blue-600 px-5 text-lg font-extrabold text-white disabled:opacity-60"
            disabled={savingCreate}
          >
            {savingCreate ? "Saving..." : "Create Profile"}
          </button>

          {message ? <p className="mt-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p> : null}
        </form>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Children</h2>

          {loading ? (
            <p className="rounded-2xl bg-white p-4 text-base font-bold text-slate-700 shadow-card dark:bg-slate-900 dark:text-slate-200">Loading profiles...</p>
          ) : null}

          {!loading && !hasChildren ? (
            <p className="rounded-2xl bg-white p-4 text-base font-bold text-slate-700 shadow-card dark:bg-slate-900 dark:text-slate-200">
              No profiles yet. Create one above.
            </p>
          ) : null}

          {!loading && hasChildren ? (
            <div className="grid gap-4">
              {children.map((child) => (
                <ChildCard key={child.child_id} child={child} onSelect={chooseChild} onEdit={startEdit} />
              ))}
            </div>
          ) : null}
        </section>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-card dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-label="Edit child profile"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Edit Profile</h3>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-slate-300 px-3 font-bold dark:border-slate-700"
                onClick={() => setEditing(null)}
                aria-label="Close edit"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                Name
                <input
                  className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                  value={editForm.child_name}
                  onChange={(e) => updateEditForm("child_name", e.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                Age
                <select
                  className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                  value={editForm.age}
                  onChange={(e) => updateEditForm("age", e.target.value)}
                  aria-label="Edit child age"
                >
                  {AGE_OPTIONS.map((ageOption) => (
                    <option key={ageOption} value={ageOption}>
                      {ageOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                Class Level
                <select
                  className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                  value={editForm.class_level}
                  onChange={(e) => updateEditForm("class_level", e.target.value)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                Curriculum
                <select
                  className="min-h-11 rounded-2xl border border-slate-300 px-4 text-base dark:border-slate-700 dark:bg-slate-800"
                  value={editForm.preferred_curriculum}
                  onChange={(e) => updateEditForm("preferred_curriculum", e.target.value)}
                  aria-label="Edit preferred curriculum"
                >
                  <option value="">No preference</option>
                  {CURRICULUM_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 flex min-h-11 items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2 text-base font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={editForm.strict_class_level}
                onChange={(e) => updateEditForm("strict_class_level", e.target.checked)}
                className="h-5 w-5"
              />
              Strict class level
            </label>

            <button
              type="submit"
              className="mt-4 min-h-12 w-full rounded-2xl bg-blue-600 px-5 text-lg font-extrabold text-white disabled:opacity-60"
              disabled={savingEdit}
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      ) : null}

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        darkMode={darkMode}
        onToggleDarkMode={handleDarkModeToggle}
        apiBaseUrl={API_BASE_URL}
      />
    </main>
  );
}
