import { FeatureBadge, ProviderBadge } from "@/components/brand/logo";
import type { DiagnoseResponse } from "@/lib/types";

type QueryBreakdownPanelProps = {
  report: DiagnoseResponse;
};

function visibilityTone(status: "visible" | "weak" | "invisible") {
  if (status === "visible") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "weak") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function QueryBreakdownPanel({ report }: QueryBreakdownPanelProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <FeatureBadge label="Buyer-Intent Surface" kind="context" />
        <ProviderBadge provider={`${report.expandedQueries.length} queries`} />
      </div>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
        Query-level visibility breakdown
      </h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Free mode shows a compact buyer-intent surface. Full audit expands this
        to a broader query cluster and multi-provider comparison.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Expanded queries</p>
          <div className="mt-4 space-y-3">
            {report.queryVisibilitySummaries.map((summary) => (
              <div
                key={summary.queryId}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${visibilityTone(
                      summary.visibilityStatus,
                    )}`}
                  >
                    {summary.visibilityStatus}
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {summary.intent.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">
                  {summary.query}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>
                    Mentioned across providers: {summary.productMentionedAcrossProviders}
                  </span>
                  <span>Best rank: {summary.bestRank ?? "Not mentioned"}</span>
                  <span>
                    Strongest competitor: {summary.strongestCompetitor ?? "None surfaced"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">Model-wise scores</p>
            <div className="mt-4 space-y-3">
              {report.modelWiseScores.map((score) => (
                <div
                  key={score.provider}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <ProviderBadge provider={score.provider} />
                    <span className="text-sm font-semibold text-slate-900">
                      {score.visibilityScore}/100
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Mention rate: {score.mentionRate}%</span>
                    <span>Avg rank: {score.averageRank ?? "N/A"}</span>
                    <span>Query coverage: {score.queryCoverage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Competitor share of voice
            </p>
            <div className="mt-4 space-y-3">
              {report.competitorShareOfVoice.slice(0, 4).map((competitor) => (
                <div
                  key={competitor.name}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-900">
                      {competitor.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {competitor.mentionCount} mentions
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Providers: {competitor.providerCount}</span>
                    <span>Queries: {competitor.queryCount}</span>
                    <span>Avg rank: {competitor.averageRank ?? "N/A"}</span>
                    <span>
                      Advantage vs product: {competitor.advantageVsProduct > 0 ? "+" : ""}
                      {competitor.advantageVsProduct}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
