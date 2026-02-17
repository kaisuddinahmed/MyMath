"use client";

type SettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  apiBaseUrl: string;
};

export default function SettingsDrawer({
  open,
  onClose,
  darkMode,
  onToggleDarkMode,
  apiBaseUrl
}: SettingsDrawerProps) {
  return (
    <>
      {open && <button className="fixed inset-0 z-40 bg-slate-950/45" aria-label="Close settings" onClick={onClose} />}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[88%] max-w-sm bg-white p-5 shadow-2xl transition-transform dark:bg-slate-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50">Settings</h2>
          <button
            className="min-h-11 min-w-11 rounded-xl border border-slate-300 px-3 text-lg text-slate-700 dark:border-slate-700 dark:text-slate-200"
            onClick={onClose}
            aria-label="Close settings"
          >
            x
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Appearance</p>
            <button
              className="flex min-h-11 w-full items-center justify-between rounded-xl bg-slate-100 px-4 py-3 text-left text-base font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              onClick={() => onToggleDarkMode(!darkMode)}
              aria-pressed={darkMode}
            >
              <span>{darkMode ? "Dark mode: On" : "Dark mode: Off"}</span>
              <span className="rounded-full bg-white px-3 py-1 text-sm dark:bg-slate-700">Toggle</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Backend API</p>
            <p className="break-all rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              {apiBaseUrl}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
