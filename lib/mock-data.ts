import { buildCompetitorLeaderboard } from "@/lib/leaderboard";
import { parseProviderResponse } from "@/lib/parser";
import {
  calculateCoverageAdjustedOverallScore,
  calculateOverallScore,
  calculateProviderCoverageRatio,
  calculateScoreBreakdown,
  EXPECTED_PROVIDER_COUNT,
} from "@/lib/scoring";
import { SAMPLE_DIAGNOSTIC_VALUES } from "@/lib/sample-input";
import type {
  DiagnoseMetadata,
  DiagnoseRequest,
  DiagnoseResponse,
  DiagnosticFormValues,
  FAQItem,
  ModelResult,
  ProviderError,
  ProviderId,
  RawModelResponse,
} from "@/lib/types";

const SAMPLE_COMPETITORS = [
  "Thorne",
  "Pure Encapsulations",
  "Doctor's Best",
  "Nature Made",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withFallback(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeEntityName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCompetitorsInput(
  input?: DiagnoseRequest["competitors"],
) {
  if (Array.isArray(input)) {
    return dedupe(input.map((item) => item.trim()).filter(Boolean));
  }

  if (typeof input === "string") {
    return dedupe(
      input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  return [];
}

function ensureCompetitors(input?: DiagnoseRequest["competitors"]) {
  return dedupe([...normalizeCompetitorsInput(input), ...SAMPLE_COMPETITORS]).slice(
    0,
    4,
  );
}

function excludeSubmittedProduct(productName: string, competitors: string[]) {
  const normalizedProductName = normalizeEntityName(productName);
  return competitors.filter(
    (competitor) =>
      normalizeEntityName(competitor) !== normalizedProductName,
  );
}

function createFaqItems(productName: string): FAQItem[] {
  return [
    {
      question: "How much elemental magnesium does one serving provide?",
      answer:
        `${productName} should state the elemental magnesium amount clearly so senior shoppers can compare serving strength without reading the full label.`,
    },
    {
      question: "Is this magnesium form gentle on digestion for older adults?",
      answer:
        "Call out glycinate as a gentler option and explain how the formula supports sleep and relaxation without relying on harsh comparison claims.",
    },
    {
      question: "How is quality verified?",
      answer:
        "Move third-party testing, GMP manufacturing, and vegan claims higher in the listing so AI answers can surface trust signals faster.",
    },
    {
      question: "Who is this product best suited for?",
      answer:
        "Position it for seniors or adult children buying for parents, then tie the benefit set directly to sleep, calm, and everyday tolerance.",
    },
  ];
}

export function createSeededRawResponses(
  targetQuery: string,
): RawModelResponse[] {
  return [
    {
      provider: "openai",
      query: targetQuery,
      response:
        "For seniors looking for a magnesium supplement, I would start with Thorne and Pure Encapsulations because both explain magnesium glycinate quality, serving clarity, and testing standards well. Doctor’s Best is another common recommendation when the goal is gentle daily support. I also see Nature Made as a more mainstream option, but premium brands usually offer stronger trust cues. In this category, products that clearly state elemental magnesium, third-party testing, and senior-friendly use cases tend to stand out the most.",
    },
    {
      provider: "gemini",
      query: targetQuery,
      response:
        "If the goal is the best magnesium supplement for seniors, I would usually rank Thorne first, followed by Pure Encapsulations and Doctor’s Best. NutraCalm Magnesium Glycinate Plus could fit for sleep and relaxation support, but it feels less senior-specific than the leading listings. The product mentions useful benefits, yet it would be stronger with clearer dosage detail, proof of third-party testing, and a short FAQ that answers older-adult concerns. Nature Made is recognizable, but I would still favor more detailed listings for this query.",
    },
    {
      provider: "anthropic",
      query: targetQuery,
      response:
        "For older adults, I would prioritize magnesium glycinate products that are gentle on digestion and transparent about serving strength. Thorne and Pure Encapsulations feel strongest because their positioning is clearer and they surface trust signals immediately. NutraCalm Magnesium Glycinate Plus is relevant for sleep, calm, and digestion support, so I would place it in the next tier, but the listing would benefit from more explicit senior-oriented language, dosage clarity, and comparison framing. Doctor’s Best remains competitive because its messaging is easier to scan quickly.",
    },
  ];
}

function providerLabel(provider: ProviderId) {
  if (provider === "openai") return "OpenAI";
  if (provider === "gemini") return "Gemini";
  return "Claude";
}

function buildModelResultSummary(
  provider: ProviderId,
  productName: string,
  mentioned: boolean,
  rank: number | null,
  mentionedProducts: ModelResult["mentionedProducts"],
) {
  const competitorNames = mentionedProducts
    .filter((product) => !product.isUserProduct)
    .slice(0, 3)
    .map((product) => product.name);

  if (!mentioned) {
    return `${providerLabel(provider)} did not mention ${productName} and instead surfaced ${competitorNames.join(", ")}.`;
  }

  if (competitorNames.length) {
    return `${providerLabel(provider)} mentioned ${productName} at rank #${rank} behind ${competitorNames.join(", ")}.`;
  }

  return `${providerLabel(provider)} mentioned ${productName} at rank #${rank}.`;
}

function buildModelResults(
  productName: string,
  competitors: string[],
  rawResponses: RawModelResponse[],
): ModelResult[] {
  return rawResponses.map((rawResponse) => {
    const parsed = parseProviderResponse({
      productName,
      competitors,
      rawResponse: rawResponse.response,
    });

    return {
      provider: rawResponse.provider,
      status: "success",
      mentioned: parsed.userProductMentioned,
      rank: parsed.userProductRank,
      sentiment: parsed.sentiment,
      confidence: parsed.confidence,
      summary: buildModelResultSummary(
        rawResponse.provider,
        productName,
        parsed.userProductMentioned,
        parsed.userProductRank,
        parsed.mentionedProducts,
      ),
      mentionedProducts: parsed.mentionedProducts,
    };
  });
}

function buildInsights(
  productDescription: string | undefined,
  competitorName: string | undefined,
  source: DiagnoseResponse["source"],
) {
  const providerContext =
    source === "mock" ? "seeded provider responses" : "live provider output";
  const providerVerb = source === "mock" ? "reward" : "rewards";

  return [
    competitorName
      ? `${competitorName} appears more consistently because the ${providerContext} ${providerVerb} clearer trust and dosage framing.`
      : `The ${providerContext} ${providerVerb} clearer trust and dosage framing more than the current listing copy.`,
    "Senior-focused messaging is still too soft, so age-specific positioning is not surfacing strongly enough.",
    productDescription?.toLowerCase().includes("third-party")
      ? "Third-party testing exists in the description, but it is not elevated clearly enough for model summaries."
      : "Testing and verification language should be made more explicit so answer engines can surface it faster.",
    "FAQ coverage is thin around tolerance, serving size, and who the product is best for.",
    "Comparison-style copy is easier for answer engines to summarize than broad benefit language alone.",
  ];
}

export const SAMPLE_DIAGNOSE_REQUEST: DiagnoseRequest = {
  productName: SAMPLE_DIAGNOSTIC_VALUES.productName,
  productUrl: undefined,
  productDescription: SAMPLE_DIAGNOSTIC_VALUES.productDescription,
  targetQuery: SAMPLE_DIAGNOSTIC_VALUES.targetQuery,
  competitors: SAMPLE_DIAGNOSTIC_VALUES.competitors
    .split(",")
    .map((item) => item.trim()),
  audience: SAMPLE_DIAGNOSTIC_VALUES.audience,
  region: SAMPLE_DIAGNOSTIC_VALUES.region,
};

export function formValuesToDiagnoseRequest(
  values: DiagnosticFormValues,
): DiagnoseRequest {
  return {
    productName: values.productName.trim(),
    productUrl: values.productUrl.trim() || undefined,
    productDescription: values.productDescription.trim() || undefined,
    targetQuery: values.targetQuery.trim(),
    competitors: values.competitors.trim() || undefined,
    audience: values.audience.trim() || undefined,
    region: values.region.trim() || undefined,
  };
}

export function createMockDiagnoseResponse(
  request: DiagnoseRequest = SAMPLE_DIAGNOSE_REQUEST,
): DiagnoseResponse {
  return buildDiagnoseResponse({
    request,
    rawResponses: createSeededRawResponses(
      withFallback(request.targetQuery, SAMPLE_DIAGNOSE_REQUEST.targetQuery),
    ),
    source: "mock",
    metadata: {
      mode: "mock",
      source: "mock",
      demoMode: true,
      providersConfigured: [],
      providersUsed: ["openai", "gemini", "anthropic"],
      providersSkipped: [],
      toolsUsed: [],
      firecrawlStatus: "skipped",
      expectedProviderCount: EXPECTED_PROVIDER_COUNT,
      successfulProviderCount: 3,
      providerCoverageRatio: 1,
      sampledScore: 0,
      coverageAdjusted: false,
      providerErrors: [],
    },
    errors: [],
  });
}

type BuildDiagnoseResponseInput = {
  request: DiagnoseRequest;
  rawResponses: RawModelResponse[];
  source: DiagnoseResponse["source"];
  metadata?: Partial<DiagnoseMetadata>;
  errors?: ProviderError[];
};

export function buildDiagnoseResponse({
  request,
  rawResponses,
  source,
  metadata,
  errors = [],
}: BuildDiagnoseResponseInput): DiagnoseResponse {
  const productName = withFallback(
    request.productName,
    SAMPLE_DIAGNOSE_REQUEST.productName,
  );
  const targetQuery = withFallback(
    request.targetQuery,
    SAMPLE_DIAGNOSE_REQUEST.targetQuery,
  );
  const productDescription =
    request.productDescription || SAMPLE_DIAGNOSE_REQUEST.productDescription;
  const competitors = excludeSubmittedProduct(
    productName,
    ensureCompetitors(request.competitors),
  );
  const modelResults = buildModelResults(productName, competitors, rawResponses);
  const competitorLeaderboard = buildCompetitorLeaderboard({
    competitors,
    modelResults,
  });
  const scoreBreakdown = calculateScoreBreakdown({
    modelResults,
    competitorLeaderboard,
    productName,
    productDescription,
    targetQuery,
  });
  const sampledScore = calculateOverallScore(scoreBreakdown);
  const expectedProviderCount =
    metadata?.expectedProviderCount ?? EXPECTED_PROVIDER_COUNT;
  const successfulProviderCount =
    metadata?.successfulProviderCount ??
    modelResults.filter((result) => result.status === "success").length;
  const providerCoverageRatio = calculateProviderCoverageRatio(
    successfulProviderCount,
    expectedProviderCount,
  );
  const coverageAdjusted = successfulProviderCount < expectedProviderCount;
  const resolvedMetadata: DiagnoseMetadata = {
    mode: metadata?.mode ?? source,
    source: metadata?.source ?? (source === "live" ? "gemini-live" : "mock"),
    demoMode: metadata?.demoMode ?? (source === "mock"),
    providersConfigured: metadata?.providersConfigured ?? [],
    providersUsed:
      metadata?.providersUsed ?? rawResponses.map((response) => response.provider),
    providersSkipped: metadata?.providersSkipped ?? [],
    toolsUsed: metadata?.toolsUsed ?? [],
    firecrawlStatus: metadata?.firecrawlStatus ?? "skipped",
    expectedProviderCount,
    successfulProviderCount,
    providerCoverageRatio,
    sampledScore,
    coverageAdjusted,
    fallbackReason: metadata?.fallbackReason,
    providerErrors: metadata?.providerErrors ?? errors,
    urlContextLength: metadata?.urlContextLength,
  };
  const overallScore = calculateCoverageAdjustedOverallScore(
    sampledScore,
    successfulProviderCount,
  );

  return {
    reportId: `${source}-${slugify(productName) || "answerrank-report"}`,
    source,
    metadata: resolvedMetadata,
    generatedAt: new Date().toISOString(),
    productName,
    productUrl: request.productUrl,
    productDescription,
    targetQuery,
    audience: request.audience || SAMPLE_DIAGNOSE_REQUEST.audience,
    region: request.region || SAMPLE_DIAGNOSE_REQUEST.region,
    overallScore,
    scoreBreakdown,
    modelResults,
    competitorLeaderboard,
    insights: buildInsights(
      productDescription,
      competitorLeaderboard[0]?.name,
      source,
    ),
    recommendations: [
      {
        category: "title",
        priority: "high",
        title: "Lead the title with the senior use case",
        description:
          `Move ${productName} closer to the target query by adding "for seniors" or an equivalent age-specific qualifier near the front of the title.`,
      },
      {
        category: "bullets",
        priority: "high",
        title: "Rewrite bullets around dosage and tolerance",
        description:
          "Make each bullet do one job: serving strength, digestion friendliness, sleep support, testing, and who the formula is best for.",
      },
      {
        category: "faq",
        priority: "high",
        title: "Add an AI-readable FAQ block",
        description:
          "Answer the exact objections buyers ask AI tools: how much magnesium per serving, who it suits, and why glycinate is gentle.",
      },
      {
        category: "trust-signals",
        priority: "medium",
        title: "Promote proof points earlier",
        description:
          "Bring third-party testing, GMP standards, and vegan manufacturing higher into the visible copy instead of leaving them buried in the description.",
      },
      {
        category: "positioning",
        priority: "medium",
        title: "Clarify who the product is for",
        description:
          "State the fit for seniors and adult children buying for parents so AI engines can match the product to an explicit audience.",
      },
      {
        category: "comparison",
        priority: "medium",
        title: "Use clean comparison language",
        description:
          `Explain why ${productName} is a better fit for sleep, calm, and digestion than more generic magnesium options without sounding spammy.`,
      },
    ],
    faqItems: createFaqItems(productName),
    rawResponses,
    errors,
  };
}
