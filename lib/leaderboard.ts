import type { CompetitorScore, QueryProviderResult } from "@/lib/types";

type LeaderboardInput = {
  competitors: string[];
  queryProviderResults: QueryProviderResult[];
};

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

function rankBonus(rank: number | null) {
  if (!rank) {
    return 0;
  }

  if (rank <= 1.5) return 20;
  if (rank <= 2.5) return 16;
  if (rank <= 3.5) return 12;
  if (rank <= 4.5) return 8;
  return 4;
}

function compactReason(reason: string) {
  const trimmed = reason.replace(/\s+/g, " ").trim();
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

export function buildCompetitorLeaderboard({
  competitors,
  queryProviderResults,
}: LeaderboardInput): CompetitorScore[] {
  const leaderboard = competitors
    .map((competitor) => {
      const mentions = queryProviderResults
        .flatMap((result) => result.competitorMentions)
        .filter(
          (mention) => mention.name.toLowerCase() === competitor.toLowerCase(),
        );

      const ranks = mentions
        .map((product) => product.rank ?? null)
        .filter((rank): rank is number => typeof rank === "number");
      const reasons = Array.from(
        new Set(
          queryProviderResults
            .filter((result) =>
              result.competitorMentions.some(
                (mention) =>
                  mention.name.toLowerCase() === competitor.toLowerCase(),
              ),
            )
            .map((result) => compactReason(result.rawSummary ?? ""))
            .filter(Boolean),
        ),
      );
      const averageRank = average(ranks);

      return {
        name: competitor,
        mentions: mentions.length,
        averageRank,
        visibilityScore:
          mentions.length * 20 + rankBonus(averageRank),
        winReason:
          reasons[0] ??
          `${competitor} appears more consistently across the seeded provider outputs.`,
        reasons,
      };
    })
    .filter((competitor) => competitor.mentions > 0)
    .sort((left, right) => {
      if (right.visibilityScore !== left.visibilityScore) {
        return right.visibilityScore - left.visibilityScore;
      }

      return (left.averageRank ?? 99) - (right.averageRank ?? 99);
    });

  return leaderboard;
}
