import type { MentionedProduct, ParsedMentionResult, Sentiment } from "@/lib/types";

const GENERIC_TOKENS = new Set([
  "and",
  "best",
  "for",
  "plus",
  "with",
  "adult",
  "adults",
  "senior",
  "seniors",
  "supplement",
  "supplements",
  "magnesium",
  "glycinate",
  "formula",
  "product",
]);

type MatchStrength = "exact" | "strong_partial" | "weak_partial";

type EntityMatch = {
  name: string;
  brand: string;
  isUserProduct: boolean;
  index: number;
  strength: MatchStrength;
  reason: string;
};

type ParserInput = {
  productName: string;
  competitors: string[];
  rawResponse: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPhraseIndex(haystack: string, phrase: string) {
  if (!phrase) {
    return -1;
  }

  const expression = new RegExp(`\\b${escapeRegExp(phrase).replace(/\s+/g, "\\s+")}\\b`);
  const match = expression.exec(haystack);
  return match?.index ?? -1;
}

function toTokens(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function buildAliases(name: string) {
  const normalized = normalizeText(name);
  const tokens = toTokens(name);
  const significantTokens = tokens.filter(
    (token) => token.length > 3 && !GENERIC_TOKENS.has(token),
  );

  const strong = new Set<string>();
  const weak = new Set<string>();

  if (significantTokens.length >= 2) {
    strong.add(significantTokens.slice(0, 2).join(" "));
  }

  if (significantTokens[0]) {
    if (significantTokens[0].length >= 6) {
      strong.add(significantTokens[0]);
    } else if (significantTokens[0].length >= 5) {
      weak.add(significantTokens[0]);
    }
  }

  const longestToken = [...significantTokens].sort((left, right) => right.length - left.length)[0];
  if (longestToken && longestToken.length >= 8) {
    strong.add(longestToken);
  }

  return {
    exact: normalized,
    strong: [...strong].filter((alias) => alias && alias !== normalized),
    weak: [...weak].filter((alias) => alias && alias !== normalized),
  };
}

function extractReason(rawResponse: string, aliases: string[]) {
  const sentences = rawResponse
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const normalizedSentence = normalizeText(sentence);
    if (aliases.some((alias) => alias && normalizedSentence.includes(alias))) {
      return sentence;
    }
  }

  return sentences[0] ?? rawResponse.trim();
}

function confidenceForStrength(strength: MatchStrength) {
  switch (strength) {
    case "exact":
      return 0.9;
    case "strong_partial":
      return 0.7;
    case "weak_partial":
      return 0.5;
  }
}

function sentimentForMention(isMentioned: boolean): Sentiment {
  return isMentioned ? "positive" : "not_mentioned";
}

function findEntityMatch(
  rawResponse: string,
  normalizedResponse: string,
  entity: { name: string; brand: string; isUserProduct: boolean },
): EntityMatch | null {
  const aliases = buildAliases(entity.name);
  const exactIndex = findPhraseIndex(normalizedResponse, aliases.exact);

  if (exactIndex >= 0) {
    return {
      ...entity,
      index: exactIndex,
      strength: "exact",
      reason: extractReason(rawResponse, [aliases.exact, ...aliases.strong]),
    };
  }

  for (const alias of aliases.strong) {
    const aliasIndex = findPhraseIndex(normalizedResponse, alias);
    if (aliasIndex >= 0) {
      return {
        ...entity,
        index: aliasIndex,
        strength: "strong_partial",
        reason: extractReason(rawResponse, [alias, aliases.exact]),
      };
    }
  }

  for (const alias of aliases.weak) {
    const aliasIndex = findPhraseIndex(normalizedResponse, alias);
    if (aliasIndex >= 0) {
      return {
        ...entity,
        index: aliasIndex,
        strength: "weak_partial",
        reason: extractReason(rawResponse, [alias, aliases.exact]),
      };
    }
  }

  return null;
}

export function parseProviderResponse({
  productName,
  competitors,
  rawResponse,
}: ParserInput): ParsedMentionResult {
  const normalizedResponse = normalizeText(rawResponse);
  const entities = [
    {
      name: productName,
      brand: productName,
      isUserProduct: true,
    },
    ...competitors.map((competitor) => ({
      name: competitor,
      brand: competitor,
      isUserProduct: false,
    })),
  ];

  const matches = entities
    .map((entity) => findEntityMatch(rawResponse, normalizedResponse, entity))
    .filter((match): match is EntityMatch => Boolean(match))
    .sort((left, right) => {
      if (left.index !== right.index) {
        return left.index - right.index;
      }

      const strengthOrder: Record<MatchStrength, number> = {
        exact: 0,
        strong_partial: 1,
        weak_partial: 2,
      };

      return strengthOrder[left.strength] - strengthOrder[right.strength];
    });

  const mentionedProducts: MentionedProduct[] = matches.map((match, index) => ({
    name: match.name,
    brand: match.brand,
    rank: index + 1,
    reason: match.reason,
    isUserProduct: match.isUserProduct,
  }));

  const userProduct = matches.find((match) => match.isUserProduct);

  return {
    mentionedProducts,
    userProductMentioned: Boolean(userProduct),
    userProductRank: userProduct ? mentionedProducts.find(
      (product) => product.isUserProduct,
    )?.rank ?? null : null,
    sentiment: sentimentForMention(Boolean(userProduct)),
    confidence: userProduct ? confidenceForStrength(userProduct.strength) : 0,
  };
}
