type InsightsPanelProps = {
  insights: string[];
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
        Insights
      </p>
      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        Why competitors are outranking this listing
      </h4>
      <div className="mt-5 space-y-3">
        {insights.map((insight, index) => (
          <div
            key={insight}
            className="rounded-2xl border border-slate-200/70 bg-slate-50/75 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-600 shadow-sm">
                {index + 1}
              </span>
              <p className="text-sm leading-7 text-slate-600">{insight}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
