import type { CompetitorScore, ModelResult, ScoreBreakdown, Sentiment } from "@/lib/types";

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
