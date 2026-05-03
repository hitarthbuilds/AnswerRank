import { CompetitorLeaderboard } from "@/components/competitor-leaderboard";
import { InsightsPanel } from "@/components/insights-panel";
import { ModelResultCard } from "@/components/model-result-card";
import { RawResponsesPanel } from "@/components/raw-responses-panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { ScoreCard } from "@/components/score-card";
import type { DiagnoseResponse } from "@/lib/types";

type ReportDashboardProps = {
  report: DiagnoseResponse | null;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReportDashboard({ report }: ReportDashboardProps) {
  if (!report) {
    return (
      <section className="section-shell overflow-hidden rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
              Report Dashboard
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Your first diagnostic report will render here
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Run the form once to render the magnesium-sample mock report with
              real score cards, provider outcomes, competitor analysis, and raw
              answer text.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            Awaiting first run
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {["Score card", "Provider results", "Recommendations"].map((item) => (
            <div
              key={item}
              className="rounded-[26px] border border-dashed border-slate-200 bg-white/70 px-5 py-12 text-center text-sm text-slate-400"
            >
              {item} appears after the mock diagnostic completes
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell overflow-hidden rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
            Mock DiagnoseResponse
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {report.productName} scores {report.overallScore}/100 for{" "}
            <span className="text-slate-700">&quot;{report.targetQuery}&quot;</span>
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            This phase renders a realistic report dashboard from seeded mock
            data so the take-home demo can show the full product story before
            live providers are wired.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span className="font-medium text-slate-800">Source: Mock mode</span>
          <span>Generated {formatTimestamp(report.generatedAt)}</span>
          <span className="break-all font-mono text-xs text-slate-400">
            {report.reportId}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <ScoreCard report={report} />
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {report.modelResults.map((result) => (
              <ModelResultCard key={result.provider} result={result} />
            ))}
          </div>
          <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <CompetitorLeaderboard competitors={report.competitorLeaderboard} />
            <InsightsPanel insights={report.insights} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <RecommendationsPanel
          recommendations={report.recommendations}
          faqItems={report.faqItems}
        />
      </div>

      <div className="mt-4">
        <RawResponsesPanel
          responses={report.rawResponses}
          modelResults={report.modelResults}
        />
      </div>
    </section>
  );
}
