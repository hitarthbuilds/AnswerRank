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

export function ScoreCard({ report }: ScoreCardProps) {
  const mentionedCount = report.modelResults.filter((result) => result.mentioned).length;
  const successfulCount = report.modelResults.filter(
    (result) => result.status === "success",
  ).length;

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
          {mentionedCount} of {successfulCount} providers mentioned the product
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Strong relevance, but the product still trails premium competitors on
          ranking depth and copy clarity.
        </p>
      </div>
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
