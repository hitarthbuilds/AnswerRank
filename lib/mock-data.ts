import { SAMPLE_DIAGNOSTIC_VALUES } from "@/lib/sample-input";
import type {
  CompetitorScore,
  DiagnoseRequest,
  DiagnoseResponse,
  DiagnosticFormValues,
  FAQItem,
  ModelResult,
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

function createLeaderboard(competitors: string[]): CompetitorScore[] {
  return [
    {
      name: competitors[0],
      mentions: 3,
      averageRank: 1.3,
      visibilityScore: 74,
      winReason:
        "Leads with premium trust signals and cleaner dosage communication.",
    },
    {
      name: competitors[1],
      mentions: 3,
      averageRank: 2,
      visibilityScore: 68,
      winReason:
        "Shows strong ingredient quality and senior-safe positioning in copy.",
    },
    {
      name: competitors[2],
      mentions: 2,
      averageRank: 3.5,
      visibilityScore: 48,
      winReason:
        "Wins on familiarity and simpler comparison language for shoppers.",
    },
    {
      name: competitors[3],
      mentions: 1,
      averageRank: 5,
      visibilityScore: 24,
      winReason:
        "Appears as a mainstream fallback because the brand is widely recognized.",
    },
  ];
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

function createRawResponses(
  productName: string,
  targetQuery: string,
  competitors: string[],
): RawModelResponse[] {
  return [
    {
      provider: "openai",
      query: targetQuery,
      response:
        `For seniors looking for a magnesium supplement, I would start with ${competitors[0]} and ${competitors[1]} because both explain magnesium glycinate quality, serving clarity, and testing standards well. ${competitors[2]} is another common recommendation when the goal is gentle daily support. I also see ${competitors[3]} as a more mainstream option, but premium brands usually offer stronger trust cues. In this category, products that clearly state elemental magnesium, third-party testing, and senior-friendly use cases tend to stand out the most.`,
    },
    {
      provider: "gemini",
      query: targetQuery,
      response:
        `If the goal is the best magnesium supplement for seniors, I would usually rank ${competitors[0]} first, followed by ${competitors[1]} and ${competitors[2]}. ${productName} could fit for sleep and relaxation support, but it feels less senior-specific than the leading listings. The product mentions useful benefits, yet it would be stronger with clearer dosage detail, proof of third-party testing, and a short FAQ that answers older-adult concerns. ${competitors[3]} is recognizable, but I would still favor more detailed listings for this query.`,
    },
    {
      provider: "anthropic",
      query: targetQuery,
      response:
        `For older adults, I would prioritize magnesium glycinate products that are gentle on digestion and transparent about serving strength. ${competitors[0]} and ${competitors[1]} feel strongest because their positioning is clearer and they surface trust signals immediately. ${productName} is relevant for sleep, calm, and digestion support, so I would place it in the next tier, but the listing would benefit from more explicit senior-oriented language, dosage clarity, and comparison framing. ${competitors[2]} remains competitive because its messaging is easier to scan quickly.`,
    },
  ];
}

function createModelResults(
  productName: string,
  competitors: string[],
): ModelResult[] {
  return [
    {
      provider: "openai",
      status: "success",
      mentioned: false,
      rank: null,
      sentiment: "not_mentioned",
      confidence: 0.97,
      summary:
        "OpenAI favored competitor listings with clearer dosage and testing language and did not mention the user product.",
      mentionedProducts: [
        {
          name: competitors[0],
          brand: competitors[0],
          rank: 1,
          reason: "Strong premium positioning and quality trust signals.",
          isUserProduct: false,
        },
        {
          name: competitors[1],
          brand: competitors[1],
          rank: 2,
          reason: "Clear ingredient quality and senior-friendly positioning.",
          isUserProduct: false,
        },
        {
          name: competitors[2],
          brand: competitors[2],
          rank: 3,
          reason: "Well-known option with recognizable comparison language.",
          isUserProduct: false,
        },
      ],
    },
    {
      provider: "gemini",
      status: "success",
      mentioned: true,
      rank: 4,
      sentiment: "positive",
      confidence: 0.74,
      summary:
        "Gemini mentioned the product, but placed it behind stronger competitor listings because the copy feels broad instead of senior-specific.",
      mentionedProducts: [
        {
          name: competitors[0],
          brand: competitors[0],
          rank: 1,
          reason: "Most complete trust and dosage narrative for older adults.",
          isUserProduct: false,
        },
        {
          name: competitors[1],
          brand: competitors[1],
          rank: 2,
          reason: "Consistent quality framing and better benefit clarity.",
          isUserProduct: false,
        },
        {
          name: competitors[2],
          brand: competitors[2],
          rank: 3,
          reason: "Simple language that reads quickly in answer summaries.",
          isUserProduct: false,
        },
        {
          name: productName,
          brand: productName,
          rank: 4,
          reason:
            "Relevant benefits are present, but the listing lacks sharper senior positioning and FAQ support.",
          isUserProduct: true,
        },
      ],
    },
    {
      provider: "anthropic",
      status: "success",
      mentioned: true,
      rank: 3,
      sentiment: "positive",
      confidence: 0.82,
      summary:
        "Claude found the product relevant and trustworthy, but still ranked two competitors above it because their benefits and comparisons were easier to parse.",
      mentionedProducts: [
        {
          name: competitors[0],
          brand: competitors[0],
          rank: 1,
          reason: "Immediate trust and premium-quality cues.",
          isUserProduct: false,
        },
        {
          name: competitors[1],
          brand: competitors[1],
          rank: 2,
          reason: "Sharper senior-safe use-case positioning.",
          isUserProduct: false,
        },
        {
          name: productName,
          brand: productName,
          rank: 3,
          reason:
            "Good benefit relevance, but still missing stronger comparison and dosage framing.",
          isUserProduct: true,
        },
        {
          name: competitors[2],
          brand: competitors[2],
          rank: 4,
          reason: "Still visible because the brand is easier to recognize.",
          isUserProduct: false,
        },
      ],
    },
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
  const productName = withFallback(request.productName, SAMPLE_DIAGNOSE_REQUEST.productName);
  const targetQuery = withFallback(request.targetQuery, SAMPLE_DIAGNOSE_REQUEST.targetQuery);
  const productDescription =
    request.productDescription || SAMPLE_DIAGNOSE_REQUEST.productDescription;
  const competitors = ensureCompetitors(request.competitors);

  return {
    reportId: `mock-${slugify(productName) || "answerrank-report"}`,
    source: "mock",
    generatedAt: new Date().toISOString(),
    productName,
    productUrl: request.productUrl,
    productDescription,
    targetQuery,
    audience: request.audience || SAMPLE_DIAGNOSE_REQUEST.audience,
    region: request.region || SAMPLE_DIAGNOSE_REQUEST.region,
    overallScore: 62,
    scoreBreakdown: {
      mentionFrequency: 20,
      rankPosition: 14,
      sentimentConfidence: 11,
      competitorGap: 8,
      queryRelevance: 9,
    },
    modelResults: createModelResults(productName, competitors),
    competitorLeaderboard: createLeaderboard(competitors),
    insights: [
      "Senior-focused messaging is too soft, so stronger age-specific positioning wins more often.",
      "Third-party testing is present in the description but not surfaced early enough for AI summaries.",
      "Dosage clarity is missing from the strongest moments in the copy, which weakens trust for comparison queries.",
      "FAQ coverage is thin, leaving gaps around digestion tolerance, serving size, and who the product is for.",
      "Competitors use simpler comparison content, making their listings easier for models to summarize confidently.",
    ],
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
    rawResponses: createRawResponses(productName, targetQuery, competitors),
    errors: [],
  };
}
