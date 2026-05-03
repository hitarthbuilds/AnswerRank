type ReportDashboardPlaceholderProps = {
  hasSubmitted: boolean;
};

const providerCards = ["OpenAI", "Gemini", "Anthropic"];

export function ReportDashboardPlaceholder({
  hasSubmitted,
}: ReportDashboardPlaceholderProps) {
  return (
    <section className="section-shell overflow-hidden rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
            Report Dashboard
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {hasSubmitted
              ? "Dashboard shell is ready for Phase 2 mock report data"
              : "Your first diagnostic report will render here"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            {hasSubmitted
              ? "The form interaction works, the loading state resolves, and the next phase can start wiring report cards into this layout."
              : "Run the form once to preview the loading state. This placeholder reserves space for scores, provider cards, competitor analysis, and recommendations."}
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
          {hasSubmitted ? "Ready for mock report payload" : "Awaiting first run"}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
            Score Snapshot
          </p>
          <div className="mt-6 flex items-center justify-center">
            <div className="flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-slate-100 bg-slate-50 text-center">
              <div>
                <div className="text-4xl font-semibold tracking-tight text-slate-300">
                  --
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                  AEO score
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {[
              "Mention frequency",
              "Rank position",
              "Sentiment confidence",
              "Competitor gap",
            ].map((item) => (
              <div key={item}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>{item}</span>
                  <span>0%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {providerCards.map((provider) => (
              <div
                key={provider}
                className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  {provider}
                </p>
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  Provider result card placeholder
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Competitor Leaderboard
              </p>
              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100">
                {["Thorne", "Pure Encapsulations", "Doctor's Best"].map(
                  (brand, index) => (
                    <div
                      key={brand}
                      className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-4 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-600 shadow-sm">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          {brand}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400">Pending</span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Recommendations
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Highlight buyer-intent keyword alignment",
                  "Make trust signals easier to detect",
                  "Reserve room for FAQs and comparison copy",
                ].map((note) => (
                  <div
                    key={note}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/75 px-4 py-4 text-sm text-slate-600"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
