"use client";

import { ChildView } from "@/lib/types";

type ChildCardProps = {
  child: ChildView;
  onSelect: (child: ChildView) => void;
  onEdit: (child: ChildView) => void;
  compact?: boolean;
};

function classBadge(level: number) {
  return `Class ${level}`;
}

export default function ChildCard({ child, onSelect, onEdit, compact = false }: ChildCardProps) {
  const initial = (child.child_name || "C").trim().charAt(0).toUpperCase() || "C";
  const curriculum = child.preferred_curriculum?.trim();

  return (
    <article className="rounded-3xl border border-blue-100 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-2xl font-extrabold text-white">
          {initial}
        </div>
        <div>
          <h3 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">{child.child_name}</h3>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{classBadge(child.class_level)} - Age {child.age}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold">
        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100">
          {curriculum || "Any Curriculum"}
        </span>
        {child.strict_class_level ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">Strict Level</span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">Flexible Level</span>
        )}
      </div>

      <div className={`grid ${compact ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
        <button
          className="min-h-11 rounded-2xl bg-blue-600 px-4 py-3 text-base font-extrabold text-white active:scale-[0.98]"
          onClick={() => onSelect(child)}
          aria-label={`Use profile ${child.child_name}`}
        >
          Use This Profile
        </button>
        {!compact && (
          <button
            className="min-h-11 rounded-2xl border-2 border-blue-200 px-4 py-3 text-base font-extrabold text-blue-900 active:scale-[0.98] dark:border-blue-800 dark:text-blue-100"
            onClick={() => onEdit(child)}
            aria-label={`Edit profile ${child.child_name}`}
          >
            Edit
          </button>
        )}
      </div>
    </article>
  );
}
