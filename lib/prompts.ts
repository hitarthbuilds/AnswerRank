import type { ProviderInput } from "@/lib/providers/types";

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
