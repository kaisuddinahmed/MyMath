"use client";

type LoadingOverlayProps = {
  open: boolean;
  label: string;
};

export default function LoadingOverlay({ open, label }: LoadingOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-card dark:bg-slate-900">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50">{label}</p>
      </div>
    </div>
  );
}
