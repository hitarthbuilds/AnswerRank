import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/server/env";

export async function GET() {
  const env = getServerEnv();

  return NextResponse.json({
    demoMode: env.demoMode,
    geminiConfigured: env.hasGeminiKey,
    firecrawlConfigured: env.hasFirecrawlKey,
    openaiConfigured: env.hasOpenAIKey,
    anthropicConfigured: env.hasAnthropicKey,
    nodeEnv: process.env.NODE_ENV ?? "development",
  });
}
