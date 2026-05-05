import { FeatureBadge } from "@/components/brand/logo";
import type { CompetitorScore } from "@/lib/types";

type CompetitorLeaderboardProps = {
  competitors: CompetitorScore[];
};

export function CompetitorLeaderboard({
  competitors,
}: CompetitorLeaderboardProps) {
  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <FeatureBadge label="Competitor Leaderboard" kind="ranking" />
          <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Who currently wins the AI answer surface
          </h4>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Sorted by visibility
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {competitors.map((competitor, index) => (
          <div
            key={competitor.name}
            className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-600 shadow-sm">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-800">
                      {competitor.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {competitor.winReason}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[360px] lg:shrink-0">
                <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Rank
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    #{index + 1}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Mentions
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {competitor.mentions}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Avg Rank
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {competitor.averageRank ?? "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Score
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {competitor.visibilityScore}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
