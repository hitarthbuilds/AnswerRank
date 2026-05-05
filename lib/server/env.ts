import "server-only";

import { parseBooleanEnv } from "@/lib/server/audit-mode";

function parseDemoMode(value: string | undefined) {
  if (typeof value !== "string") {
    return true;
  }

  return value.trim().toLowerCase() === "true";
}

export function getServerEnv() {
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || undefined;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim() || undefined;
  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY?.trim() || undefined;
  const demoMode = parseDemoMode(process.env.NEXT_PUBLIC_DEMO_MODE);
  const upstashRedisRestUrl =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || undefined;
  const upstashRedisRestToken =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || undefined;
  const fullAuditEnabled = parseBooleanEnv(
    process.env.ANSWER_RANK_FULL_AUDIT_ENABLED,
    false,
  );
  const llmQueryExpansionEnabled = parseBooleanEnv(
    process.env.ANSWER_RANK_LLM_QUERY_EXPANSION,
    false,
  );
  const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;

  return {
    openaiApiKey,
    geminiApiKey,
    anthropicApiKey,
    firecrawlApiKey,
    upstashRedisRestUrl,
    upstashRedisRestToken,
    databaseUrl,
    demoMode,
    fullAuditEnabled,
    llmQueryExpansionEnabled,
    hasOpenAIKey: Boolean(openaiApiKey),
    hasGeminiKey: Boolean(geminiApiKey),
    hasAnthropicKey: Boolean(anthropicApiKey),
    hasAnyProviderKey: Boolean(
      openaiApiKey || geminiApiKey || anthropicApiKey,
    ),
    hasFirecrawlKey: Boolean(firecrawlApiKey),
    hasRedis: Boolean(upstashRedisRestUrl && upstashRedisRestToken),
    hasDatabase: Boolean(databaseUrl),
  };
}
