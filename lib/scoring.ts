import type {
  CompetitorScore,
  CompetitorShareOfVoice,
  CoverageLevel,
  ModelResult,
  QueryCoverageSummary,
  QueryProviderResult,
  ScoreBreakdown,
  Sentiment,
} from "@/lib/types";

export const EXPECTED_PROVIDER_COUNT = 3;

const QUERY_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "best",
  "for",
  "the",
  "to",
  "with",
  "of",
  "in",
  "on",
]);

function roundScore(value: number) {
  return Math.round(value);
}

function rankPositionValue(rank: number | null) {
  if (!rank) {
    return 0;
  }

  if (rank === 1) return 25;
  if (rank === 2) return 20;
  if (rank === 3) return 16;
  if (rank === 4) return 12;
  if (rank === 5) return 8;
  return 5;
}

function sentimentValue(sentiment: Sentiment) {
  if (sentiment === "positive") return 20;
  if (sentiment === "neutral") return 12;
  if (sentiment === "negative") return 5;
  return 0;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeKeywords(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && token.length > 2 && !QUERY_STOP_WORDS.has(token));
}

export function scoreQueryRelevance(
  productDescription: string | undefined,
  productName: string,
  targetQuery: string,
) {
  const queryTokens = tokenizeKeywords(targetQuery);
  const sourceTokens = new Set(
    tokenizeKeywords([productName, productDescription ?? ""].join(" ")),
  );
  const overlapCount = queryTokens.filter((token) => sourceTokens.has(token)).length;
  const overlapRatio = queryTokens.length ? overlapCount / queryTokens.length : 0;

  if (overlapCount >= 2 || overlapRatio >= 0.5) {
    return 10;
  }

  if (overlapCount >= 1 || overlapRatio >= 0.25) {
    return 5;
  }

  return 0;
}

type ScoreInput = {
  modelResults: ModelResult[];
  competitorLeaderboard: CompetitorScore[];
  productName: string;
  productDescription?: string;
  targetQuery: string;
};

export function calculateScoreBreakdown({
  modelResults,
  competitorLeaderboard,
  productName,
  productDescription,
  targetQuery,
}: ScoreInput): ScoreBreakdown {
  const successfulProviders = modelResults.filter(
    (result) => result.status === "success",
  );

  if (!successfulProviders.length) {
    return {
      mentionFrequency: 0,
      rankPosition: 0,
      sentimentConfidence: 0,
      competitorGap: 0,
      queryRelevance: 0,
    };
  }

  const mentionedCount = successfulProviders.filter((result) => result.mentioned).length;
  const userProductMentions = mentionedCount;
  const topCompetitorMentions = competitorLeaderboard[0]?.mentions ?? 0;

  const mentionFrequency =
    (mentionedCount / successfulProviders.length) * 30;

  const rankPosition =
    successfulProviders.reduce(
      (total, result) => total + rankPositionValue(result.rank),
      0,
    ) / successfulProviders.length;

  const sentimentConfidence =
    successfulProviders.reduce(
      (total, result) =>
        total + sentimentValue(result.sentiment) * result.confidence,
      0,
    ) / successfulProviders.length;

  const competitorGap = Math.max(
    0,
    Math.min(15, 15 - (topCompetitorMentions - userProductMentions) * 5),
  );

  const queryRelevance = scoreQueryRelevance(
    productDescription,
    productName,
    targetQuery,
  );

  return {
    mentionFrequency: roundScore(mentionFrequency),
    rankPosition: roundScore(rankPosition),
    sentimentConfidence: roundScore(sentimentConfidence),
    competitorGap: roundScore(competitorGap),
    queryRelevance: roundScore(queryRelevance),
  };
}

export function calculateOverallScore(scoreBreakdown: ScoreBreakdown) {
  return Math.min(
    100,
    scoreBreakdown.mentionFrequency +
      scoreBreakdown.rankPosition +
      scoreBreakdown.sentimentConfidence +
      scoreBreakdown.competitorGap +
      scoreBreakdown.queryRelevance,
  );
}

export function calculateProviderCoverageRatio(
  successfulProviderCount: number,
  expectedProviderCount = EXPECTED_PROVIDER_COUNT,
) {
  if (!expectedProviderCount) {
    return 0;
  }

  return successfulProviderCount / expectedProviderCount;
}

export function getCoverageCappedMaxScore(successfulProviderCount: number) {
  if (successfulProviderCount >= 3) {
    return 100;
  }

  if (successfulProviderCount === 2) {
    return 88;
  }

  if (successfulProviderCount === 1) {
    return 75;
  }

  return 0;
}

export function calculateCoverageAdjustedOverallScore(
  sampledScore: number,
  successfulProviderCount: number,
) {
  return Math.min(sampledScore, getCoverageCappedMaxScore(successfulProviderCount));
}

export function calculateCoverageLevel(
  successfulProviderCount: number,
): CoverageLevel {
  if (successfulProviderCount >= 3) {
    return "tri-engine";
  }

  if (successfulProviderCount >= 2) {
    return "partial";
  }

  return "sample";
}

function buildCompetitorMentionMap(
  queryProviderResults: QueryProviderResult[],
) {
  const map = new Map<string, CompetitorShareOfVoice>();

  for (const result of queryProviderResults) {
    for (const mention of result.competitorMentions) {
      const existing = map.get(mention.name) ?? {
        name: mention.name,
        mentionCount: 0,
        providerCount: 0,
        queryCount: 0,
        averageRank: null,
        advantageVsProduct: 0,
      };
      const providerSet = new Set<string>(
        (existing as CompetitorShareOfVoice & { _providers?: string[] })._providers ??
          [],
      );
      const querySet = new Set<string>(
        (existing as CompetitorShareOfVoice & { _queries?: string[] })._queries ??
          [],
      );
      const rankValues = (
        existing as CompetitorShareOfVoice & { _ranks?: number[] }
      )._ranks ?? [];

      providerSet.add(result.provider);
      querySet.add(result.queryId);
      if (typeof mention.rank === "number") {
        rankValues.push(mention.rank);
      }

      map.set(mention.name, {
        ...existing,
        mentionCount: existing.mentionCount + 1,
        providerCount: providerSet.size,
        queryCount: querySet.size,
        averageRank: rankValues.length
          ? Number(
              (rankValues.reduce((sum, value) => sum + value, 0) /
                rankValues.length).toFixed(1),
            )
          : null,
        advantageVsProduct: 0,
        _providers: [...providerSet],
        _queries: [...querySet],
        _ranks: rankValues,
      } as CompetitorShareOfVoice & {
        _providers: string[];
        _queries: string[];
        _ranks: number[];
      });
    }
  }

  return [...map.values()].map((entry) => ({
    name: entry.name,
    mentionCount: entry.mentionCount,
    providerCount: entry.providerCount,
    queryCount: entry.queryCount,
    averageRank: entry.averageRank,
    advantageVsProduct: entry.advantageVsProduct,
  }));
}

export function buildCompetitorShareOfVoice(input: {
  queryProviderResults: QueryProviderResult[];
  productMentionCount: number;
}) {
  return buildCompetitorMentionMap(input.queryProviderResults)
    .map((item) => ({
      ...item,
      advantageVsProduct: item.mentionCount - input.productMentionCount,
    }))
    .sort((left, right) => {
      if (right.mentionCount !== left.mentionCount) {
        return right.mentionCount - left.mentionCount;
      }

      return (left.averageRank ?? 99) - (right.averageRank ?? 99);
    });
}

export function buildQueryCoverageSummary(input: {
  expandedQueries: Array<{ id: string; query: string; priority: "high" | "medium" | "low" }>;
  queryProviderResults: QueryProviderResult[];
}) : QueryCoverageSummary {
  const grouped = new Map<string, QueryProviderResult[]>();

  for (const result of input.queryProviderResults) {
    const current = grouped.get(result.queryId) ?? [];
    current.push(result);
    grouped.set(result.queryId, current);
  }

  const highPriorityQueries = input.expandedQueries.filter(
    (query) => query.priority === "high",
  );
  const visibleHighPriority = highPriorityQueries.filter((query) =>
    (grouped.get(query.id) ?? []).some((result) => result.productMentioned),
  );
  const invisibleQueries = input.expandedQueries
    .filter((query) =>
      !(grouped.get(query.id) ?? []).some((result) => result.productMentioned),
    )
    .map((query) => query.query);

  return {
    totalExpandedQueries: input.expandedQueries.length,
    highPriorityQueries: highPriorityQueries.length,
    productVisibleOnHighPriorityQueries: visibleHighPriority.length,
    invisibleQueries,
  };
}

export function calculateMultiQueryScoreBreakdown(input: {
  queryProviderResults: QueryProviderResult[];
  competitorShareOfVoice: CompetitorShareOfVoice[];
  productName: string;
  productDescription?: string;
  targetQuery: string;
}) {
  const successfulRuns = input.queryProviderResults;

  if (!successfulRuns.length) {
    return {
      mentionFrequency: 0,
      rankPosition: 0,
      sentimentConfidence: 0,
      competitorGap: 0,
      queryRelevance: 0,
    } satisfies ScoreBreakdown;
  }

  const mentionedRuns = successfulRuns.filter((result) => result.productMentioned);
  const mentionFrequency = (mentionedRuns.length / successfulRuns.length) * 30;
  const rankPosition =
    successfulRuns.reduce(
      (total, result) => total + rankPositionValue(result.productRank ?? null),
      0,
    ) / successfulRuns.length;
  const sentimentConfidence =
    successfulRuns.reduce(
      (total, result) =>
        total + sentimentValue(result.productMentioned ? "positive" : "not_mentioned") * (result.confidence ?? 0),
      0,
    ) / successfulRuns.length;

  const topCompetitorMentions = input.competitorShareOfVoice[0]?.mentionCount ?? 0;
  const competitorGap = Math.max(
    0,
    Math.min(15, 15 - (topCompetitorMentions - mentionedRuns.length) * 2),
  );

  const queryRelevance = scoreQueryRelevance(
    input.productDescription,
    input.productName,
    input.targetQuery,
  );

  return {
    mentionFrequency: roundScore(mentionFrequency),
    rankPosition: roundScore(rankPosition),
    sentimentConfidence: roundScore(sentimentConfidence),
    competitorGap: roundScore(competitorGap),
    queryRelevance: roundScore(queryRelevance),
  } satisfies ScoreBreakdown;
}

export function calculateConfidenceScore(input: {
  providerCoverageRatio: number;
  queryCoverage: QueryCoverageSummary;
}) {
  const providerComponent = input.providerCoverageRatio * 70;
  const queryComponent = input.queryCoverage.highPriorityQueries
    ? (input.queryCoverage.productVisibleOnHighPriorityQueries /
        input.queryCoverage.highPriorityQueries) *
      30
    : 0;

  return Math.round(Math.min(100, providerComponent + queryComponent));
}
