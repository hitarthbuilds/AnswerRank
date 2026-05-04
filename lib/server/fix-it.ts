import "server-only";

import { buildFixItPrompt } from "@/lib/prompts";
import { createTimeoutController, getErrorMessage } from "@/lib/providers/utils";
import { getServerEnv } from "@/lib/server/env";
import type {
  DiagnoseResponse,
  FAQItem,
  FixItRequest,
  FixItResponse,
} from "@/lib/types";

const GEMINI_MODEL = "gemini-3-flash-preview";

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function simplifyQuery(targetQuery: string) {
  return targetQuery
    .replace(/\b(best|top|recommended)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMockFaq(report: DiagnoseResponse): FAQItem[] {
  if (report.faqItems.length) {
    return report.faqItems.slice(0, 4);
  }

  return [
    {
      question: `Who is ${report.productName} best suited for?`,
      answer:
        "Position the listing around the highest-intent buyer and make the use case clear in the first two sentences.",
    },
    {
      question: "How much should a buyer understand from the first screen?",
      answer:
        "State dosage, trust signals, and the main benefit stack immediately so answer engines can summarize the listing cleanly.",
    },
  ];
}

function createDeterministicFixItResponse(
  report: DiagnoseResponse,
  productDescription?: string,
): FixItResponse {
  const cleanQuery = titleCase(simplifyQuery(report.targetQuery) || report.targetQuery);
  const audience = report.audience || "high-intent shoppers";
  const positioningFocus =
    report.recommendations[0]?.description ||
    "clear buyer fit, trust signals, and dosage clarity";
  const currentDescription =
    productDescription?.trim() || report.productDescription || "";

  return {
    rewrittenTitle: `${report.productName} for ${cleanQuery} | Gentle Daily Support with Clear Dosage & Trust Signals`,
    rewrittenBullets: [
      `Lead with product fit: explain that ${report.productName} is designed for ${audience.toLowerCase()} looking for a cleaner answer to "${report.targetQuery}".`,
      "Clarify dosage and serving strength in one bullet so the buyer understands what one serving delivers without scanning the full description.",
      "Promote trust signals earlier: mention third-party testing, manufacturing quality, ingredient quality, and any certifications near the top of the listing.",
      "Use comparison-style language to explain why this listing is a better fit than generic alternatives, especially for tolerance, daily use, and intended outcomes.",
      currentDescription
        ? `Condense the current description into shorter buyer-facing lines that preserve the best proof points: ${currentDescription.slice(0, 110).trimEnd()}...`
        : "Add a short FAQ-style bullet that answers who the product is for, how to use it, and what makes the formulation easier to trust.",
    ],
    generatedFAQ: buildMockFaq(report),
    positioningStatement: `${report.productName} should be positioned as the clearer, easier-to-trust choice for "${report.targetQuery}", with stronger buyer intent matching and faster-to-scan proof points. ${positioningFocus}`,
  };
}

function extractGeminiText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || null;
}

function stripCodeFences(value: string) {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalizeFixItResponse(
  value: unknown,
  fallback: FixItResponse,
): FixItResponse {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const input = value as Partial<FixItResponse>;
  const rewrittenBullets = Array.isArray(input.rewrittenBullets)
    ? input.rewrittenBullets
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 5)
    : [];
  const generatedFAQ = Array.isArray(input.generatedFAQ)
    ? input.generatedFAQ
        .map((item) =>
          item &&
          typeof item === "object" &&
          typeof item.question === "string" &&
          typeof item.answer === "string"
            ? {
                question: item.question.trim(),
                answer: item.answer.trim(),
              }
            : null,
        )
        .filter((item): item is FAQItem => Boolean(item?.question && item.answer))
    : [];

  return {
    rewrittenTitle:
      typeof input.rewrittenTitle === "string" && input.rewrittenTitle.trim()
        ? input.rewrittenTitle.trim()
        : fallback.rewrittenTitle,
    rewrittenBullets:
      rewrittenBullets.length === 5
        ? rewrittenBullets
        : [...rewrittenBullets, ...fallback.rewrittenBullets].slice(0, 5),
    generatedFAQ: generatedFAQ.length
      ? generatedFAQ
      : fallback.generatedFAQ,
    positioningStatement:
      typeof input.positioningStatement === "string" &&
      input.positioningStatement.trim()
        ? input.positioningStatement.trim()
        : fallback.positioningStatement,
  };
}

async function generateGeminiFixIt(
  request: FixItRequest,
): Promise<FixItResponse> {
  const { geminiApiKey } = getServerEnv();

  if (!geminiApiKey) {
    throw new Error("Gemini is not configured for Fix It generation.");
  }

  const fallback = createDeterministicFixItResponse(
    request.report,
    request.productDescription,
  );
  const { signal, cleanup } = createTimeoutController();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildFixItPrompt(
                    request.report,
                    request.productDescription,
                  ),
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal,
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini Fix It request failed with ${response.status}${body ? `: ${body}` : ""}`,
      );
    }

    const payload = await response.json();
    const rawText = extractGeminiText(payload);

    if (!rawText) {
      throw new Error("Gemini returned an empty Fix It response.");
    }

    const parsed = JSON.parse(stripCodeFences(rawText));
    return normalizeFixItResponse(parsed, fallback);
  } finally {
    cleanup();
  }
}

export async function generateFixItResponse(
  request: FixItRequest,
): Promise<FixItResponse> {
  const env = getServerEnv();

  if (env.demoMode || !env.hasGeminiKey) {
    return createDeterministicFixItResponse(
      request.report,
      request.productDescription,
    );
  }

  try {
    return await generateGeminiFixIt(request);
  } catch (error) {
    console.info("[fix-it]", {
      demoMode: env.demoMode,
      hasGeminiKey: env.hasGeminiKey,
      fallbackReason: getErrorMessage(error, "Gemini Fix It generation failed"),
    });

    return createDeterministicFixItResponse(
      request.report,
      request.productDescription,
    );
  }
}
