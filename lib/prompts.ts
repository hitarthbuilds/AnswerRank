import type { ProviderInput } from "@/lib/providers/types";
import type { DiagnoseResponse } from "@/lib/types";

function clampPromptSection(value: string | undefined, maxLength = 5_000) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function buildShoppingAssistantPrompt(input: ProviderInput) {
  const competitors =
    input.competitors && input.competitors.length
      ? input.competitors.join(", ")
      : "None provided";
  const urlContext = clampPromptSection(input.urlContext);
  const contextSection = urlContext
    ? `
Product page context:
${urlContext}
`
    : "";

  return `You are an AI shopping assistant answering a buyer-intent product recommendation query.

The product below is being evaluated for visibility in the answer. Use its context if relevant, but do not force it into the recommendation.
Recommend the analyzed product only if it naturally fits the buyer query. If stronger competitors fit better, say so and compare naturally against known competitors.

Buyer query:
"${input.targetQuery}"

Product being analyzed:
Name: ${input.productName}
Description: ${input.productDescription ?? "Not provided"}
${contextSection}Audience:
${input.audience ?? "Not provided"}

Region:
${input.region ?? "Not provided"}

Known competitors:
${competitors}

Instruction:
Answer naturally as an AI shopping assistant. Include specific product or brand recommendations if relevant. Do not mention this is a diagnostic test.`;
}

function compactFixItReport(report: DiagnoseResponse) {
  return {
    productName: report.productName,
    targetQuery: report.targetQuery,
    audience: report.audience,
    region: report.region,
    overallScore: report.overallScore,
    scoreBreakdown: report.scoreBreakdown,
    providerResults: report.modelResults.map((result) => ({
      provider: result.provider,
      mentioned: result.mentioned,
      rank: result.rank,
      summary: result.summary,
    })),
    competitorLeaderboard: report.competitorLeaderboard.slice(0, 4).map((item) => ({
      name: item.name,
      mentions: item.mentions,
      averageRank: item.averageRank,
      visibilityScore: item.visibilityScore,
      winReason: item.winReason,
    })),
    insights: report.insights,
    recommendations: report.recommendations.map((item) => ({
      category: item.category,
      priority: item.priority,
      title: item.title,
      description: item.description,
    })),
    faqItems: report.faqItems,
  };
}

export function buildFixItPrompt(
  report: DiagnoseResponse,
  productDescription?: string,
) {
  const currentDescription =
    productDescription?.trim() || report.productDescription || "Not provided";

  return `You are an AEO listing strategist for ecommerce brands.

Use the diagnostic report to rewrite the product listing so it is easier for AI answer engines to understand, rank, and recommend.

Focus on:
- buyer intent
- clear product fit
- trust signals
- dosage/feature clarity
- comparison language
- FAQ-style answers

Diagnostic report:
${JSON.stringify(compactFixItReport(report), null, 2)}

Current product description:
${currentDescription}

Return JSON only:
{
  "rewrittenTitle": "string",
  "rewrittenBullets": ["string", "string", "string", "string", "string"],
  "generatedFAQ": [
    { "question": "string", "answer": "string" }
  ],
  "positioningStatement": "string"
}`;
}
