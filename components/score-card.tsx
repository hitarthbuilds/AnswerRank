import type { DiagnoseResponse, ScoreBreakdown } from "@/lib/types";

const breakdownConfig: Array<{
  key: keyof ScoreBreakdown;
  label: string;
  max: number;
}> = [
  { key: "mentionFrequency", label: "Mention Frequency", max: 30 },
  { key: "rankPosition", label: "Rank Position", max: 25 },
  { key: "sentimentConfidence", label: "Sentiment Confidence", max: 20 },
  { key: "competitorGap", label: "Competitor Gap", max: 15 },
  { key: "queryRelevance", label: "Query Relevance", max: 10 },
];

type ScoreCardProps = {
  report: DiagnoseResponse;
};

function getScoreSummary(overallScore: number, mentionedCount: number) {
  if (mentionedCount === 0) {
    return "The product was not detected in the sampled AI answers. Improve product naming, positioning, and query alignment.";
  }

  if (overallScore >= 85) {
    return "Excellent AI visibility. The product is consistently surfaced across answer engines and ranks ahead of most competitors.";
  }

  if (overallScore >= 60) {
    return "Strong relevance, but the product still has room to improve ranking depth, trust signals, and copy clarity.";
  }

  return "Limited AI visibility. The product is either missing from key answer engines or being outranked by clearer competitor listings.";
}

function getCoverageLabel(successfulProviderCount: number) {
  return `${successfulProviderCount} of 3 planned answer engines tested`;
}

function getMentionedProvidersLabel(
  report: DiagnoseResponse,
  mentionedCount: number,
  successfulCount: number,
) {
  if (report.metadata.coverageAdjusted && successfulCount === 1) {
    return mentionedCount > 0
      ? "Gemini mentioned the product in this live run"
      : "Gemini did not mention the product in this live run";
  }

  if (report.metadata.coverageAdjusted && successfulCount === 2) {
    return `${mentionedCount} active providers mentioned the product`;
  }

  return `${mentionedCount} of ${successfulCount} providers mentioned the product`;
}

function getCoverageNote(report: DiagnoseResponse) {
  if (!report.metadata.coverageAdjusted) {
    return null;
  }

  if (report.metadata.successfulProviderCount === 1) {
    return "Coverage adjusted: this live run used 1 of 3 planned answer engines. Gemini visibility is strong, but full AEO confidence requires OpenAI and Claude adapters too.";
  }

  if (report.metadata.successfulProviderCount === 2) {
    return "Coverage adjusted: this live run used 2 of 3 planned answer engines. Visibility is directionally strong, but full AEO confidence still requires the remaining adapter.";
  }

  if (report.metadata.successfulProviderCount === 0) {
    return "Coverage adjusted: this live run used 0 of 3 planned answer engines. The displayed score is capped until a real answer-engine response succeeds.";
  }

  return null;
}

export function ScoreCard({ report }: ScoreCardProps) {
  const mentionedCount = report.modelResults.filter((result) => result.mentioned).length;
  const successfulCount = report.metadata.successfulProviderCount;
  const scoreSummary = getScoreSummary(report.overallScore, mentionedCount);
  const coverageNote = getCoverageNote(report);

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
        Score Card
      </p>
      <div className="mt-5 flex items-center justify-center">
        <div
          className="relative flex h-44 w-44 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--accent) ${report.overallScore}%, rgba(148, 163, 184, 0.16) 0)`,
          }}
        >
          <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <span className="text-5xl font-semibold tracking-tight text-slate-950">
              {report.overallScore}
            </span>
            <span className="mt-1 text-xs uppercase tracking-[0.26em] text-slate-400">
              AEO Score
            </span>
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
        <p className="text-sm font-medium text-slate-800">
          {getMentionedProvidersLabel(report, mentionedCount, successfulCount)}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
          {getCoverageLabel(successfulCount)}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {scoreSummary}
        </p>
        {coverageNote ? (
          <p className="mt-3 text-sm leading-6 text-amber-700">
            {coverageNote}
          </p>
        ) : null}
      </div>
      {report.metadata.coverageAdjusted ? (
        <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <p>
            Sampled score {report.metadata.sampledScore}/100 capped to{" "}
            {report.overallScore}/100 based on live provider coverage.
          </p>
        </div>
      ) : null}
      <div className="mt-6 space-y-4">
        {breakdownConfig.map((item) => {
          const value = report.scoreBreakdown[item.key];
          const percent = Math.round((value / item.max) * 100);

          return (
            <div key={item.key}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-mono text-slate-500">
                  {value}/{item.max}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
