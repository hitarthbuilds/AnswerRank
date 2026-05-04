const metrics = [
  { value: "Gemini live + adapters", label: "Answer engines" },
  { value: "<3 min", label: "Demo length" },
  { value: "Gemini + Firecrawl", label: "APIs / tools" },
];

export function HeroSection() {
  return (
    <section className="glass-panel relative overflow-hidden rounded-[32px] px-6 py-8 sm:px-10 sm:py-10">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_42%)] lg:block" />
      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-600">
              AnswerRank AI / AEO Diagnostic
            </span>
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            See how your product shows up inside AI buying answers.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
            AnswerRank AI helps ecommerce teams test visibility across AI answer
            engines, compare competitor mentions, and turn response gaps into a
            clean report workflow.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#workspace"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Start a diagnostic
            </a>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-sm">
              Live Gemini + Firecrawl demo with mock fallback.
            </div>
          </div>
        </div>
        <div className="grid gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[24px] border border-white/80 bg-white/82 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)]"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
