import "server-only";

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

  return {
    openaiApiKey,
    geminiApiKey,
    anthropicApiKey,
    firecrawlApiKey,
    demoMode,
    hasOpenAIKey: Boolean(openaiApiKey),
    hasGeminiKey: Boolean(geminiApiKey),
    hasAnthropicKey: Boolean(anthropicApiKey),
    hasAnyProviderKey: Boolean(
      openaiApiKey || geminiApiKey || anthropicApiKey,
    ),
    hasFirecrawlKey: Boolean(firecrawlApiKey),
  };
}
