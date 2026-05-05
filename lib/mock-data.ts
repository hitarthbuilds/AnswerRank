import { buildCompetitorLeaderboard } from "@/lib/leaderboard";
import { parseProviderResponse } from "@/lib/parser";
import {
  buildCompetitorShareOfVoice,
  buildQueryCoverageSummary,
  calculateConfidenceScore,
  calculateCoverageLevel,
  calculateCoverageAdjustedOverallScore,
  calculateMultiQueryScoreBreakdown,
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
  ExpandedQuery,
  FAQItem,
  ModelResult,
  ModelWiseScore,
  ProviderError,
  ProviderId,
  QueryExpansionResult,
  QueryProviderResult,
  QueryVisibilitySummary,
  RawModelResponse,
  Recommendation,
} from "@/lib/types";

const LEGACY_SAMPLE_COMPETITORS = [
  "Thorne",
  "Pure Encapsulations",
  "Doctor's Best",
  "Nature Made",
];

const HK_VITALS_SAMPLE_COMPETITORS = [
  "Tata 1mg Magnesium Glycinate",
  "HealthyHey Magnesium Glycinate",
  "Himalayan Organics Magnesium",
  "Carbamide Forte Magnesium",
  "Wellbeing Nutrition Magnesium",
];

type MockScenarioId = "legacy-magnesium" | "hk-vitals";

type ParsedRun = {
  rawResponse: RawModelResponse;
  expandedQuery: ExpandedQuery;
  parsed: ReturnType<typeof parseProviderResponse>;
};

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

function normalizeScenarioText(value: string | undefined) {
  return normalizeEntityName(value ?? "");
}

function selectMockScenario(
  request: Partial<DiagnoseRequest>,
): MockScenarioId {
  const productName = normalizeScenarioText(request.productName);
  const targetQuery = normalizeScenarioText(request.targetQuery);
  const region = normalizeScenarioText(request.region);

  if (productName.includes("hk vitals")) {
    return "hk-vitals";
  }

  if (productName.includes("magnesium glycinate") && region.includes("india")) {
    return "hk-vitals";
  }

  if (
    targetQuery.includes("magnesium glycinate") &&
    targetQuery.includes("india")
  ) {
    return "hk-vitals";
  }

  return "legacy-magnesium";
}

function getScenarioDefaultCompetitors(
  scenarioId: MockScenarioId,
) {
  return scenarioId === "hk-vitals"
    ? HK_VITALS_SAMPLE_COMPETITORS
    : LEGACY_SAMPLE_COMPETITORS;
}

function ensureCompetitors(
  input: DiagnoseRequest["competitors"] | undefined,
  fallbackCompetitors: string[],
) {
  const normalized = normalizeCompetitorsInput(input);
  return normalized.length ? dedupe(normalized) : fallbackCompetitors;
}

function excludeSubmittedProduct(productName: string, competitors: string[]) {
  const normalizedProductName = normalizeEntityName(productName);
  return competitors.filter(
    (competitor) =>
      normalizeEntityName(competitor) !== normalizedProductName,
  );
}

function createLegacyFaqItems(productName: string): FAQItem[] {
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

function createHkVitalsFaqItems(productName: string): FAQItem[] {
  return [
    {
      question: "How much elemental magnesium does one serving provide?",
      answer:
        `${productName} should state elemental magnesium per serving clearly so buyers in India can compare it against Tata 1mg, HealthyHey, and Carbamide Forte without guessing.`,
    },
    {
      question: "Is magnesium glycinate a better fit for sleep and muscle recovery?",
      answer:
        "Yes, the listing should explicitly connect glycinate to sleep quality, muscle relaxation, and recovery support instead of leaving those benefits implied.",
    },
    {
      question: "Is this formula gentle on digestion?",
      answer:
        "Bring digestion tolerance higher in the copy and explain why glycinate is positioned as a gentler choice than broader magnesium blends or oxide-heavy formulas.",
    },
    {
      question: "How is product quality verified?",
      answer:
        "Surface testing, manufacturing quality, and formulation trust signals earlier so answer engines can summarize the product more confidently.",
    },
  ];
}

function createFaqItems(
  productName: string,
  scenarioId: MockScenarioId,
): FAQItem[] {
  return scenarioId === "hk-vitals"
    ? createHkVitalsFaqItems(productName)
    : createLegacyFaqItems(productName);
}

export function createSeededRawResponses(
  targetQuery: string,
  request?: Partial<DiagnoseRequest>,
): RawModelResponse[] {
  const scenarioId = selectMockScenario({
    ...request,
    targetQuery,
  });

  if (scenarioId === "hk-vitals") {
    return [
      {
        provider: "openai",
        query: targetQuery,
        response:
          "For shoppers in India looking for magnesium glycinate for sleep and muscle recovery, I would usually start with Tata 1mg Magnesium Glycinate because the dosage framing is easier to understand quickly. Himalayan Organics Magnesium is another recognizable India-available listing in the category, and Wellbeing Nutrition Magnesium is often surfaced when brands make daily-use positioning easier to scan. In this segment, products perform better when they state elemental magnesium, serving size, digestion tolerance, and quality cues more clearly than broad wellness claims alone.",
      },
      {
        provider: "gemini",
        query: targetQuery,
        response:
          "If the goal is the best magnesium glycinate supplement for sleep and muscle recovery in India, I would put HK Vitals 100% Magnesium Glycinate near the top because it is clearly positioned around sleep, relaxation, and recovery support. HealthyHey Magnesium Glycinate is another strong option, and Carbamide Forte Magnesium also shows up often for muscle support. Wellbeing Nutrition Magnesium is recognizable, but HK Vitals feels more directly aligned to this specific query when the buyer wants glycinate rather than a broader magnesium blend. The listing would still be stronger with exact elemental magnesium, serving-size clarity, and more visible trust signals.",
      },
      {
        provider: "anthropic",
        query: targetQuery,
        response:
          "For sleep support and post-workout recovery in India, I would first look at Tata 1mg Magnesium Glycinate and HealthyHey Magnesium Glycinate because their dosage and trust framing are easier to scan quickly. Carbamide Forte Magnesium also remains competitive for broader recovery messaging. HK Vitals 100% Magnesium Glycinate is relevant and uses the right glycinate positioning, but I would place it a bit lower until the listing makes serving strength, quality proof, and digestion tolerance more explicit.",
      },
    ];
  }

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

function buildSingleModelResultSummary(
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
    if (!competitorNames.length) {
      return `${providerLabel(provider)} did not mention ${productName}. Provider did not surface clear competing brands in this response.`;
    }

    return `${providerLabel(provider)} did not mention ${productName} and instead surfaced ${competitorNames.join(", ")}.`;
  }

  if (competitorNames.length) {
    if (rank === 1) {
      return `${providerLabel(provider)} mentioned ${productName} at rank #1 ahead of ${competitorNames.join(", ")}.`;
    }

    return `${providerLabel(provider)} mentioned ${productName} at rank #${rank} behind ${competitorNames.join(", ")}.`;
  }

  return `${providerLabel(provider)} mentioned ${productName} at rank #${rank}.`;
}

function buildParsedRuns(
  productName: string,
  competitors: string[],
  rawResponses: RawModelResponse[],
  expandedQueries: ExpandedQuery[],
): ParsedRun[] {
  const queryMap = new Map(expandedQueries.map((query) => [query.id, query]));
  const queryTextMap = new Map(
    expandedQueries.map((query) => [normalizeEntityName(query.query), query]),
  );
  const fallbackQuery =
    expandedQueries[0] ??
    ({
      id: slugify(rawResponses[0]?.query || productName || "seed-query"),
      query: rawResponses[0]?.query || "",
      intent: "best_for_use_case",
      priority: "high",
      source: "seed",
    } satisfies ExpandedQuery);

  return rawResponses.map((rawResponse) => {
    const parsed = parseProviderResponse({
      productName,
      competitors,
      rawResponse: rawResponse.response,
    });
    const expandedQuery =
      (rawResponse.queryId ? queryMap.get(rawResponse.queryId) : undefined) ??
      queryTextMap.get(normalizeEntityName(rawResponse.query)) ??
      fallbackQuery;

    return {
      rawResponse: {
        ...rawResponse,
        queryId: rawResponse.queryId ?? expandedQuery.id,
        intent: rawResponse.intent ?? expandedQuery.intent,
      },
      expandedQuery,
      parsed,
    };
  });
}

function buildMultiQueryModelResultSummary(
  provider: ProviderId,
  productName: string,
  mentionCount: number,
  totalQueries: number,
  bestRank: number | null,
  competitorNames: string[],
) {
  if (!mentionCount) {
    if (!competitorNames.length) {
      return `${providerLabel(provider)} did not mention ${productName}. Provider did not surface clear competing brands in this response.`;
    }

    return `${providerLabel(provider)} did not mention ${productName} across ${totalQueries} buyer-intent checks and instead surfaced ${competitorNames.join(", ")}.`;
  }

  if (competitorNames.length) {
    return `${providerLabel(provider)} mentioned ${productName} in ${mentionCount} of ${totalQueries} buyer-intent checks with a best rank of #${bestRank}, while also surfacing ${competitorNames.join(", ")}.`;
  }

  return `${providerLabel(provider)} mentioned ${productName} in ${mentionCount} of ${totalQueries} buyer-intent checks with a best rank of #${bestRank}.`;
}

function buildModelResults(productName: string, parsedRuns: ParsedRun[]): ModelResult[] {
  const providers = Array.from(
    new Set(parsedRuns.map((run) => run.rawResponse.provider)),
  );

  return providers.map((provider) => {
    const providerRuns = parsedRuns.filter(
      (run) => run.rawResponse.provider === provider,
    );
    const mentionRuns = providerRuns.filter(
      (run) => run.parsed.userProductMentioned,
    );
    const bestRun =
      mentionRuns.sort(
        (left, right) =>
          (left.parsed.userProductRank ?? 99) - (right.parsed.userProductRank ?? 99),
      )[0] ?? providerRuns[0];
    const competitorNames = Array.from(
      new Set(
        providerRuns.flatMap((run) =>
          run.parsed.mentionedProducts
            .filter((product) => !product.isUserProduct)
            .slice(0, 3)
            .map((product) => product.name),
        ),
      ),
    ).slice(0, 3);
    const confidence = mentionRuns.length
      ? Number(
          (
            mentionRuns.reduce(
              (sum, run) => sum + run.parsed.confidence,
              0,
            ) / mentionRuns.length
          ).toFixed(2),
        )
      : 0;
    const bestRank = mentionRuns.length
      ? Math.min(...mentionRuns.map((run) => run.parsed.userProductRank ?? 99))
      : null;

    return {
      provider,
      status: "success",
      mentioned: Boolean(mentionRuns.length),
      rank: bestRank,
      sentiment: mentionRuns.length ? "positive" : "not_mentioned",
      confidence,
      summary:
        providerRuns.length === 1
          ? buildSingleModelResultSummary(
              provider,
              productName,
              bestRun.parsed.userProductMentioned,
              bestRun.parsed.userProductRank,
              bestRun.parsed.mentionedProducts,
            )
          : buildMultiQueryModelResultSummary(
              provider,
              productName,
              mentionRuns.length,
              providerRuns.length,
              bestRank,
              competitorNames,
            ),
      mentionedProducts: bestRun?.parsed.mentionedProducts ?? [],
    };
  });
}

function buildQueryProviderResults(parsedRuns: ParsedRun[]): QueryProviderResult[] {
  return parsedRuns.map((run) => ({
    queryId: run.expandedQuery.id,
    query: run.expandedQuery.query,
    intent: run.expandedQuery.intent,
    provider: run.rawResponse.provider,
    productMentioned: run.parsed.userProductMentioned,
    productRank: run.parsed.userProductRank,
    competitorMentions: run.parsed.mentionedProducts
      .filter((product) => !product.isUserProduct)
      .map((product) => ({
        name: product.name,
        rank: product.rank,
        sentiment: "neutral",
      })),
    rawSummary: run.parsed.mentionedProducts[0]?.reason ?? run.rawResponse.response,
    confidence: run.parsed.confidence,
  }));
}

function buildQueryVisibilitySummaries(
  expandedQueries: ExpandedQuery[],
  queryProviderResults: QueryProviderResult[],
): QueryVisibilitySummary[] {
  return expandedQueries.map((expandedQuery) => {
    const runs = queryProviderResults.filter(
      (result) => result.queryId === expandedQuery.id,
    );
    const mentionedRuns = runs.filter((result) => result.productMentioned);
    const strongestCompetitorCounts = new Map<
      string,
      { count: number; bestRank: number | null }
    >();

    for (const run of runs) {
      for (const mention of run.competitorMentions) {
        const current = strongestCompetitorCounts.get(mention.name) ?? {
          count: 0,
          bestRank: null,
        };

        strongestCompetitorCounts.set(mention.name, {
          count: current.count + 1,
          bestRank:
            current.bestRank === null
              ? mention.rank ?? null
              : Math.min(current.bestRank, mention.rank ?? current.bestRank),
        });
      }
    }

    const strongestCompetitor = [...strongestCompetitorCounts.entries()].sort(
      (left, right) => {
        if (right[1].count !== left[1].count) {
          return right[1].count - left[1].count;
        }

        return (left[1].bestRank ?? 99) - (right[1].bestRank ?? 99);
      },
    )[0]?.[0] ?? null;

    const mentionCount = mentionedRuns.length;
    const providerCount = runs.length || 1;
    const visibilityStatus =
      mentionCount === 0
        ? "invisible"
        : mentionCount >= Math.max(1, Math.ceil(providerCount / 2))
          ? "visible"
          : "weak";

    return {
      queryId: expandedQuery.id,
      query: expandedQuery.query,
      intent: expandedQuery.intent,
      productMentionedAcrossProviders: mentionCount,
      bestRank: mentionedRuns.length
        ? Math.min(...mentionedRuns.map((run) => run.productRank ?? 99))
        : null,
      strongestCompetitor,
      visibilityStatus,
    };
  });
}

function buildModelWiseScores(
  queryProviderResults: QueryProviderResult[],
  expandedQueries: ExpandedQuery[],
): ModelWiseScore[] {
  const providers = Array.from(
    new Set(queryProviderResults.map((result) => result.provider)),
  );

  return providers.map((provider) => {
    const runs = queryProviderResults.filter((result) => result.provider === provider);
    const mentionRuns = runs.filter((result) => result.productMentioned);
    const averageRank = mentionRuns.length
      ? Number(
          (
            mentionRuns.reduce(
              (sum, result) => sum + (result.productRank ?? 0),
              0,
            ) / mentionRuns.length
          ).toFixed(1),
        )
      : null;
    const mentionRate = runs.length ? mentionRuns.length / runs.length : 0;
    const visibleQueries = new Set(
      mentionRuns.map((result) => result.queryId),
    ).size;
    const queryCoverage = expandedQueries.length
      ? visibleQueries / expandedQueries.length
      : 0;

    return {
      provider,
      visibilityScore: Math.round(
        Math.min(100, mentionRate * 60 + (averageRank ? Math.max(0, 40 - averageRank * 8) : 0)),
      ),
      mentionRate: Number((mentionRate * 100).toFixed(1)),
      averageRank,
      queryCoverage: Number((queryCoverage * 100).toFixed(1)),
    };
  });
}

function buildInsights(
  productDescription: string | undefined,
  competitorName: string | undefined,
  source: DiagnoseResponse["source"],
  scenarioId: MockScenarioId,
  queryCoverageSummary?: DiagnoseResponse["queryCoverage"],
) {
  if (scenarioId === "hk-vitals") {
    const leadCompetitor =
      competitorName || "HealthyHey Magnesium Glycinate";

    const insights = [
      `HK Vitals appears in the sampled AI answers, but ${leadCompetitor} still outranks it when dosage and trust framing are easier to scan.`,
      'Make "magnesium glycinate for sleep and muscle recovery in India" explicit much earlier in the title and top bullets.',
      "Surface elemental magnesium amount, serving size, quality proof, and digestion tolerance earlier in the listing.",
      "India-specific comparison copy would help answer engines choose HK Vitals over Tata 1mg, HealthyHey, and Carbamide Forte.",
      "FAQ coverage should answer who it is best for, how recovery support differs from general wellness magnesium, and why glycinate is positioned as a gentler form.",
    ];

    if (queryCoverageSummary && queryCoverageSummary.invisibleQueries.length) {
      insights.unshift(
        `The product is still invisible on ${queryCoverageSummary.invisibleQueries.length} buyer-intent queries, so the broader AI buying surface is not fully captured yet.`,
      );
    }

    return insights;
  }

  const providerContext =
    source === "mock" ? "seeded provider responses" : "live provider output";
  const providerVerb = source === "mock" ? "reward" : "rewards";

  const insights = [
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

  if (queryCoverageSummary && queryCoverageSummary.invisibleQueries.length) {
    insights.unshift(
      `The listing still misses ${queryCoverageSummary.invisibleQueries.length} buyer-intent variants across the sampled AI answer surface.`,
    );
  }

  return insights;
}

function buildRecommendations(
  productName: string,
  targetQuery: string,
  scenarioId: MockScenarioId,
): Recommendation[] {
  if (scenarioId === "hk-vitals") {
    return [
      {
        category: "title",
        priority: "high",
        title: 'Lead with "Magnesium Glycinate for Sleep & Muscle Recovery"',
        description:
          `Bring the exact buyer intent from "${targetQuery}" into the front of the title so AI answers can match HK Vitals to the query faster.`,
      },
      {
        category: "bullets",
        priority: "high",
        title: "Add exact elemental magnesium and serving-size detail",
        description:
          "State how much elemental magnesium one serving provides, how many servings are included, and what daily use looks like.",
      },
      {
        category: "trust-signals",
        priority: "high",
        title: "Promote testing and manufacturing trust earlier",
        description:
          "Bring testing, certifications, quality standards, and any pharmacist or doctor-facing trust cues above the fold if they are available.",
      },
      {
        category: "faq",
        priority: "medium",
        title: "Add FAQ copy for sleep, recovery, and digestion tolerance",
        description:
          "Answer whether the formula supports restful sleep, muscle relaxation, gentle digestion, and who it is best suited for.",
      },
      {
        category: "positioning",
        priority: "medium",
        title: "Clarify the India-specific use case",
        description:
          "Position the product explicitly for Indian adults looking for better sleep, muscle recovery, and stress support with a glycinate form.",
      },
      {
        category: "comparison",
        priority: "medium",
        title: "Use comparison copy against generic magnesium forms",
        description:
          `${productName} should explain why glycinate is a better fit for sleep and recovery than harsher or more generic magnesium oxide-style options.`,
      },
    ];
  }

  return [
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
  ];
}

export const SAMPLE_DIAGNOSE_REQUEST: DiagnoseRequest = {
  productName: SAMPLE_DIAGNOSTIC_VALUES.productName,
  productUrl: SAMPLE_DIAGNOSTIC_VALUES.productUrl || undefined,
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
  const expandedQueries = [
    {
      id: slugify(SAMPLE_DIAGNOSE_REQUEST.targetQuery),
      query: SAMPLE_DIAGNOSE_REQUEST.targetQuery,
      intent: "best_for_use_case",
      priority: "high",
      source: "seed",
    } satisfies ExpandedQuery,
  ];

  return buildDiagnoseResponse({
    request,
    rawResponses: createSeededRawResponses(
      withFallback(request.targetQuery, SAMPLE_DIAGNOSE_REQUEST.targetQuery),
      request,
    ),
    expandedQueries,
    source: "mock",
    metadata: {
      mode: "mock",
      source: "mock",
      auditMode: "free",
      demoMode: true,
      providersConfigured: [],
      providersUsed: ["openai", "gemini", "anthropic"],
      providersSkipped: [],
      toolsUsed: [],
      toolsAttempted: [],
      firecrawlStatus: "skipped",
      cacheStatus: "skipped",
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
  expandedQueries?: ExpandedQuery[];
  source: DiagnoseResponse["source"];
  metadata?: Partial<DiagnoseMetadata>;
  errors?: ProviderError[];
};

export function buildDiagnoseResponse({
  request,
  rawResponses,
  expandedQueries,
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
  const region = request.region || SAMPLE_DIAGNOSE_REQUEST.region;
  const audience = request.audience || SAMPLE_DIAGNOSE_REQUEST.audience;
  const scenarioId = selectMockScenario({
    productName,
    productDescription,
    targetQuery,
    region,
    audience,
  });
  const competitors = excludeSubmittedProduct(
    productName,
    ensureCompetitors(
      request.competitors,
      getScenarioDefaultCompetitors(scenarioId),
    ),
  );
  const resolvedExpandedQueries =
    expandedQueries && expandedQueries.length
      ? expandedQueries
      : [
          {
            id: slugify(targetQuery),
            query: targetQuery,
            intent: "best_for_use_case",
            priority: "high",
            source: "seed",
          } satisfies ExpandedQuery,
        ];
  const parsedRuns = buildParsedRuns(
    productName,
    competitors,
    rawResponses,
    resolvedExpandedQueries,
  );
  const normalizedRawResponses = parsedRuns.map((run) => run.rawResponse);
  const queryProviderResults = buildQueryProviderResults(parsedRuns);
  const modelResults = buildModelResults(productName, parsedRuns);
  const competitorLeaderboard = buildCompetitorLeaderboard({
    competitors,
    queryProviderResults,
  });
  const competitorShareOfVoice = buildCompetitorShareOfVoice({
    queryProviderResults,
    productMentionCount: queryProviderResults.filter(
      (result) => result.productMentioned,
    ).length,
  });
  const queryVisibilitySummaries = buildQueryVisibilitySummaries(
    resolvedExpandedQueries,
    queryProviderResults,
  );
  const queryCoverage = buildQueryCoverageSummary({
    expandedQueries: resolvedExpandedQueries,
    queryProviderResults,
  });
  const scoreBreakdown =
    resolvedExpandedQueries.length > 1
      ? calculateMultiQueryScoreBreakdown({
          queryProviderResults,
          competitorShareOfVoice,
          productName,
          productDescription,
          targetQuery,
        })
      : calculateScoreBreakdown({
          modelResults,
          competitorLeaderboard,
          productName,
          productDescription,
          targetQuery,
        });
  const visibilityScore = calculateOverallScore(scoreBreakdown);
  const expectedProviderCount =
    metadata?.expectedProviderCount ?? EXPECTED_PROVIDER_COUNT;
  const successfulProviderCount =
    metadata?.successfulProviderCount ??
    new Set(
      modelResults
        .filter((result) => result.status === "success")
        .map((result) => result.provider),
    ).size;
  const providerCoverageRatio = calculateProviderCoverageRatio(
    successfulProviderCount,
    expectedProviderCount,
  );
  const coverageAdjusted = successfulProviderCount < expectedProviderCount;
  const coverageLevel = calculateCoverageLevel(successfulProviderCount);
  const confidenceScore = calculateConfidenceScore({
    providerCoverageRatio,
    queryCoverage,
  });
  const resolvedMetadata: DiagnoseMetadata = {
    mode: metadata?.mode ?? source,
    source: metadata?.source ?? (source === "live" ? "gemini-live" : "mock"),
    auditMode: metadata?.auditMode ?? request.auditMode ?? "free",
    demoMode: metadata?.demoMode ?? (source === "mock"),
    providersConfigured: metadata?.providersConfigured ?? [],
    providersUsed:
      metadata?.providersUsed ??
      Array.from(new Set(normalizedRawResponses.map((response) => response.provider))),
    providersSkipped: metadata?.providersSkipped ?? [],
    toolsUsed: metadata?.toolsUsed ?? [],
    toolsAttempted: metadata?.toolsAttempted ?? [],
    firecrawlStatus: metadata?.firecrawlStatus ?? "skipped",
    cacheStatus: metadata?.cacheStatus ?? "skipped",
    expectedProviderCount,
    successfulProviderCount,
    providerCoverageRatio,
    sampledScore: visibilityScore,
    coverageAdjusted,
    fallbackReason: metadata?.fallbackReason,
    providerErrors: metadata?.providerErrors ?? errors,
    urlContextLength: metadata?.urlContextLength,
  };
  const overallScore = calculateCoverageAdjustedOverallScore(
    visibilityScore,
    successfulProviderCount,
  );
  const queryExpansion: QueryExpansionResult = {
    seedQuery: targetQuery,
    expandedQueries: resolvedExpandedQueries,
    mode: resolvedMetadata.auditMode,
    generatedAt: new Date().toISOString(),
  };

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
    visibilityScore,
    confidenceScore,
    coverageLevel,
    scoreBreakdown,
    modelResults,
    expandedQueries: resolvedExpandedQueries,
    queryExpansion,
    queryProviderResults,
    queryVisibilitySummaries,
    modelWiseScores: buildModelWiseScores(
      queryProviderResults,
      resolvedExpandedQueries,
    ),
    competitorShareOfVoice,
    queryCoverage,
    competitorLeaderboard,
    insights: buildInsights(
      productDescription,
      competitorLeaderboard[0]?.name,
      source,
      scenarioId,
      queryCoverage,
    ),
    recommendations: buildRecommendations(
      productName,
      targetQuery,
      scenarioId,
    ),
    faqItems: createFaqItems(productName, scenarioId),
    rawResponses: normalizedRawResponses,
    errors,
  };
}
