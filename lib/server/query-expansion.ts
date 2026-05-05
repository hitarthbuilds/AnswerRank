import "server-only";

import { buildProviderRunPolicy, parseBooleanEnv } from "@/lib/server/audit-mode";
import { MAX_BUYER_QUERY_CHARS } from "@/lib/server/limits";
import { getServerEnv } from "@/lib/server/env";
import type {
  AuditMode,
  DiagnoseRequest,
  ExpandedQuery,
  QueryExpansionResult,
  QueryIntent,
} from "@/lib/types";

const FEATURE_KEYWORDS = [
  "high absorption",
  "gentle digestion",
  "third-party tested",
  "non drowsy",
  "sleep",
  "stress support",
  "muscle recovery",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function dedupeQueries(queries: ExpandedQuery[]) {
  const seen = new Set<string>();

  return queries.filter((item) => {
    const normalized = normalizeText(item.query);

    if (!normalized || normalized.length > MAX_BUYER_QUERY_CHARS) {
      return false;
    }

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function inferPriority(
  query: string,
  source: ExpandedQuery["source"],
): ExpandedQuery["priority"] {
  const normalized = normalizeText(query);

  if (source === "seed") {
    return "high";
  }

  if (
    normalized.includes("best ") ||
    normalized.includes(" vs ") ||
    normalized.includes(" for ")
  ) {
    return "high";
  }

  if (
    normalized.includes("alternative") ||
    normalized.includes("compare") ||
    normalized.includes("value")
  ) {
    return "medium";
  }

  return "low";
}

function createQuery(
  query: string,
  intent: QueryIntent,
  source: ExpandedQuery["source"],
): ExpandedQuery {
  const trimmed = query.trim();

  return {
    id: slugify(trimmed) || `query-${Math.random().toString(36).slice(2, 8)}`,
    query: trimmed,
    intent,
    priority: inferPriority(trimmed, source),
    source,
  };
}

function extractUseCaseTerms(query: string) {
  const normalized = normalizeText(query);
  const hits = ["sleep", "muscle recovery", "stress", "digestion", "anxiety"]
    .filter((term) => normalized.includes(term));

  return hits.length ? hits : ["daily support"];
}

function extractProductCategory(
  productName: string,
  targetQuery: string,
) {
  const normalized = normalizeText(`${productName} ${targetQuery}`);

  if (normalized.includes("magnesium glycinate")) {
    return "magnesium glycinate supplement";
  }

  if (normalized.includes("supplement")) {
    return "supplement";
  }

  return "product";
}

function buildDeterministicQueries(
  request: DiagnoseRequest,
  mode: AuditMode,
  maxQueries: number,
) {
  const region = request.region?.trim();
  const competitors = Array.isArray(request.competitors)
    ? request.competitors
    : typeof request.competitors === "string"
      ? request.competitors.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  const useCases = extractUseCaseTerms(request.targetQuery);
  const productCategory = extractProductCategory(
    request.productName,
    request.targetQuery,
  );

  const generated: ExpandedQuery[] = [
    createQuery(request.targetQuery, "best_for_use_case", "seed"),
  ];

  if (useCases.length >= 2) {
    generated.push(
      createQuery(
        `best ${productCategory} for ${useCases[0]}${region ? ` in ${region}` : ""}`,
        "best_for_use_case",
        "deterministic",
      ),
    );
    generated.push(
      createQuery(
        `best ${productCategory} for ${useCases[1]}${region ? ` in ${region}` : ""}`,
        "problem_solution",
        "deterministic",
      ),
    );
  }

  if (competitors[0]) {
    generated.push(
      createQuery(
        `${request.productName} vs ${competitors[0]}`,
        "comparison",
        "deterministic",
      ),
    );
  }

  if (competitors[1]) {
    generated.push(
      createQuery(
        `${request.productName} alternative to ${competitors[1]}`,
        "alternative",
        "deterministic",
      ),
    );
  }

  if (region) {
    generated.push(
      createQuery(
        `${productCategory} with high absorption ${region}`,
        "regional_purchase",
        "deterministic",
      ),
    );
  }

  generated.push(
    createQuery(
      `best gentle ${productCategory} for ${useCases.slice(0, 2).join(" and ")}`,
      "ingredient_or_feature",
      "deterministic",
    ),
  );
  generated.push(
    createQuery(
      `${productCategory} for ${useCases[0]} with third-party testing`,
      "trust_or_safety",
      "deterministic",
    ),
  );
  generated.push(
    createQuery(
      `best value ${productCategory}${region ? ` in ${region}` : ""}`,
      "price_value",
      "deterministic",
    ),
  );

  for (const feature of FEATURE_KEYWORDS) {
    generated.push(
      createQuery(
        `${productCategory} ${feature}${region ? ` ${region}` : ""}`.trim(),
        "ingredient_or_feature",
        "deterministic",
      ),
    );
  }

  return dedupeQueries(generated).slice(
    0,
    mode === "free" ? Math.min(maxQueries, 3) : maxQueries,
  );
}

async function buildLlmExpandedQueries(
  request: DiagnoseRequest,
  mode: AuditMode,
  maxQueries: number,
): Promise<ExpandedQuery[]> {
  const env = getServerEnv();

  if (
    mode !== "full" ||
    !env.hasGeminiKey ||
    !parseBooleanEnv(process.env.ANSWER_RANK_LLM_QUERY_EXPANSION, false)
  ) {
    return [];
  }

  const prompt = `Generate up to ${Math.max(maxQueries - 1, 1)} buyer-intent ecommerce search queries as a compact JSON array.
Keep each query under ${MAX_BUYER_QUERY_CHARS} characters.
Prefer direct buying, comparison, alternative, trust, and regional purchase variants.

Product: ${request.productName}
Seed query: ${request.targetQuery}
Audience: ${request.audience ?? "Not provided"}
Region: ${request.region ?? "Not provided"}
Competitors: ${
    Array.isArray(request.competitors)
      ? request.competitors.join(", ")
      : request.competitors ?? "None"
  }

Return JSON only:
[{"query":"string","intent":"best_for_use_case|comparison|alternative|problem_solution|ingredient_or_feature|regional_purchase|trust_or_safety|price_value"}]`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const rawText = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!rawText) {
    return [];
  }

  const parsed = JSON.parse(
    rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim(),
  ) as Array<{ query?: string; intent?: QueryIntent }>;

  return dedupeQueries(
    parsed.map((item) =>
      createQuery(
        item.query ?? "",
        item.intent ?? "best_for_use_case",
        "llm",
      ),
    ),
  ).slice(0, Math.max(maxQueries - 1, 0));
}

export async function expandBuyerIntentQueries(input: {
  request: DiagnoseRequest;
  mode: AuditMode;
  maxQueries: number;
}): Promise<QueryExpansionResult> {
  const deterministic = buildDeterministicQueries(
    input.request,
    input.mode,
    input.maxQueries,
  );
  let llmQueries: ExpandedQuery[] = [];

  try {
    llmQueries = await buildLlmExpandedQueries(
      input.request,
      input.mode,
      input.maxQueries,
    );
  } catch (error) {
    console.warn("[query-expansion] Falling back to deterministic queries.", {
      message: error instanceof Error ? error.message : "Unknown error",
      mode: input.mode,
    });
  }

  const fallbackSeedQuery = createQuery(
    input.request.targetQuery,
    "best_for_use_case",
    "seed",
  );
  const expandedQueries = dedupeQueries([
    ...(deterministic.length ? deterministic : [fallbackSeedQuery]),
    ...llmQueries,
  ]).slice(0, input.maxQueries);

  return {
    seedQuery: input.request.targetQuery,
    expandedQueries: expandedQueries.length
      ? expandedQueries
      : [fallbackSeedQuery],
    mode: input.mode,
    generatedAt: new Date().toISOString(),
  };
}

export function getFreeModeExpansionPreview(request: DiagnoseRequest) {
  const env = getServerEnv();
  const policy = buildProviderRunPolicy({
    requestedMode: request.auditMode,
    fullAuditEnabled: env.fullAuditEnabled,
    hasGeminiKey: env.hasGeminiKey,
    hasOpenAIKey: env.hasOpenAIKey,
    hasAnthropicKey: env.hasAnthropicKey,
  });

  return buildDeterministicQueries(request, policy.mode, policy.maxQueries);
}
