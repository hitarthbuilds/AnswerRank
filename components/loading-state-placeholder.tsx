const stages = [
  "Validating product context",
  "Collecting provider outputs",
  "Rendering score breakdown and raw responses",
];

export function LoadingStatePlaceholder() {
  return (
    <section className="section-shell overflow-hidden rounded-[28px] p-6 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
            Loading State
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Building the diagnostic report
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            The app is validating inputs, gathering product context, and
            preparing the scored dashboard response.
          </p>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-[var(--accent)]" />
          </div>
          <div className="mt-5 space-y-3">
            {stages.map((stage, index) => (
              <div
                key={stage}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">
                  0{index + 1}
                </span>
                <span className="text-sm text-slate-700">{stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className="rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-sm"
            >
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-6 h-16 animate-pulse rounded-3xl bg-slate-100" />
              <div className="mt-4 space-y-3">
                <div className="h-3 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
