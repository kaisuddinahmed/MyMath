import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="app-shell min-h-screen p-4 sm:p-6">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-card backdrop-blur sm:p-7 dark:border-slate-700 dark:bg-slate-900/90">
        <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-blue-700 dark:text-blue-200">Welcome to</p>
        <h1 className="font-display text-5xl font-extrabold leading-tight text-slate-900 dark:text-slate-50">MyMath</h1>
        <p className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">Short, clear math help for kids.</p>

        <div className="mt-6 grid gap-4">
          <Link
            href="/parent"
            className="flex min-h-14 items-center justify-center rounded-3xl bg-blue-600 px-5 text-xl font-extrabold text-white shadow-lg active:scale-[0.99]"
            aria-label="Enter parent mode"
          >
            I'm a Parent
          </Link>
          <Link
            href="/child"
            className="flex min-h-14 items-center justify-center rounded-3xl bg-emerald-500 px-5 text-xl font-extrabold text-white shadow-lg active:scale-[0.99]"
            aria-label="Enter child mode"
          >
            I'm a Child
          </Link>
        </div>

        <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          Safe by design: no ads, no social features, no dark patterns.
        </p>
      </section>
    </main>
  );
}
