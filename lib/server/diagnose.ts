import "server-only";

import { buildDiagnoseResponse, createSeededRawResponses } from "@/lib/mock-data";
import {
  calculateProviderCoverageRatio,
  EXPECTED_PROVIDER_COUNT,
} from "@/lib/scoring";
import { runProviders } from "@/lib/providers";
import { extractProductContext } from "@/lib/providers/firecrawl";
import type { ProviderInput } from "@/lib/providers/types";
import { getServerEnv } from "@/lib/server/env";
import type {
  DiagnoseMetadata,
  DiagnoseRequest,
  DiagnoseResponse,
  FirecrawlStatus,
  ProviderError,
  RawModelResponse,
} from "@/lib/types";

function toProviderInput(
  request: DiagnoseRequest,
  urlContext?: string,
): ProviderInput {
  return {
    productName: request.productName,
    productDescription: request.productDescription,
    productUrl: request.productUrl,
    urlContext,
    targetQuery: request.targetQuery,
    competitors: Array.isArray(request.competitors)
      ? request.competitors
      : typeof request.competitors === "string"
        ? request.competitors
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined,
    audience: request.audience,
    region: request.region,
  };
}

function toReportErrors(
  errors: Array<{ provider: ProviderError["provider"]; message: string }>,
) {
  return errors.map<ProviderError>((error) => ({
    provider: error.provider,
    message: error.message,
    recoverable: true,
  }));
}

function toRawResponses(
  targetQuery: string,
  outputs: Array<{ provider: RawModelResponse["provider"]; rawResponse: string }>,
): RawModelResponse[] {
  return outputs.map((output) => ({
    provider: output.provider,
    query: targetQuery,
    response: output.rawResponse,
  }));
}

function buildUrlContext(input: {
  title?: string;
  markdown?: string;
  text?: string;
}) {
  const parts = [
    input.title ? `Page title: ${input.title}` : null,
    input.markdown ?? input.text ?? null,
  ].filter(Boolean);

  return parts.join("\n\n") || undefined;
}

function getFirecrawlStatus(input: {
  productUrl?: string;
  hasFirecrawlKey: boolean;
  firecrawlSuccess: boolean;
}): FirecrawlStatus {
  if (!input.productUrl?.trim()) {
    return "skipped";
  }

  if (!input.hasFirecrawlKey) {
    return "unavailable";
  }

  return input.firecrawlSuccess ? "used" : "failed";
}

function buildConfiguredServices(input: {
  hasGeminiKey: boolean;
  hasOpenAIKey: boolean;
  hasAnthropicKey: boolean;
  hasFirecrawlKey: boolean;
}) {
  const services: string[] = [];

  if (input.hasGeminiKey) {
    services.push("gemini");
  }

  if (input.hasOpenAIKey) {
    services.push("openai");
  }

  if (input.hasAnthropicKey) {
    services.push("anthropic");
  }

  if (input.hasFirecrawlKey) {
    services.push("firecrawl");
  }

  return services;
}

function buildSkippedProviders(input: {
  hasGeminiKey: boolean;
  hasOpenAIKey: boolean;
  hasAnthropicKey: boolean;
  providerSkipped: string[];
}) {
  const skipped = new Set(input.providerSkipped);

  if (!input.hasGeminiKey) {
    skipped.add("gemini");
  }

  if (!input.hasOpenAIKey) {
    skipped.add("openai");
  }

  if (!input.hasAnthropicKey) {
    skipped.add("anthropic");
  }

  return Array.from(skipped);
}

function buildMetadata(input: {
  mode: DiagnoseMetadata["mode"];
  source: DiagnoseMetadata["source"];
  demoMode: boolean;
  providersConfigured: string[];
  providersUsed: string[];
  providersSkipped: string[];
  toolsUsed: string[];
  firecrawlStatus: FirecrawlStatus;
  successfulProviderCount: number;
  fallbackReason?: string;
  providerErrors?: ProviderError[];
  urlContextLength?: number;
}): DiagnoseMetadata {
  const expectedProviderCount = EXPECTED_PROVIDER_COUNT;

  return {
    mode: input.mode,
    source: input.source,
    demoMode: input.demoMode,
    providersConfigured: Array.from(new Set(input.providersConfigured)),
    providersUsed: Array.from(new Set(input.providersUsed)),
    providersSkipped: Array.from(new Set(input.providersSkipped)),
    toolsUsed: Array.from(new Set(input.toolsUsed)),
    firecrawlStatus: input.firecrawlStatus,
    expectedProviderCount,
    successfulProviderCount: input.successfulProviderCount,
    providerCoverageRatio: calculateProviderCoverageRatio(
      input.successfulProviderCount,
      expectedProviderCount,
    ),
    sampledScore: 0,
    coverageAdjusted: input.successfulProviderCount < expectedProviderCount,
    fallbackReason: input.fallbackReason,
    providerErrors: input.providerErrors ?? [],
    urlContextLength: input.urlContextLength,
  };
}

function selectLiveSource(
  providersUsed: string[],
): DiagnoseMetadata["source"] {
  const providerSet = new Set(providersUsed);

  if (
    providerSet.has("openai") &&
    providerSet.has("gemini") &&
    providerSet.has("anthropic")
  ) {
    return "full-live";
  }

  if (providersUsed.length === 1 && providerSet.has("gemini")) {
    return "gemini-live";
  }

  return "live-partial";
}

function logDiagnoseEvent(input: {
  demoMode: boolean;
  hasGeminiKey: boolean;
  hasFirecrawlKey: boolean;
  selectedMode: string;
  providersUsed: string[];
  fallbackReason?: string;
}) {
  console.info("[diagnose]", {
    demoMode: input.demoMode,
    hasGeminiKey: input.hasGeminiKey,
    hasFirecrawlKey: input.hasFirecrawlKey,
    selectedMode: input.selectedMode,
    providersUsed: input.providersUsed,
    fallbackReason: input.fallbackReason,
  });
}

function buildMockResponseWithMetadata(
  request: DiagnoseRequest,
  metadata: Partial<DiagnoseMetadata>,
  errors: ProviderError[],
) {
  return buildDiagnoseResponse({
    request,
    rawResponses: createSeededRawResponses(request.targetQuery),
    source: "mock",
    metadata,
    errors,
  });
}

export async function generateDiagnoseResponse(
  request: DiagnoseRequest,
): Promise<DiagnoseResponse> {
  const env = getServerEnv();
  const providersConfigured = buildConfiguredServices({
    hasGeminiKey: env.hasGeminiKey,
    hasOpenAIKey: env.hasOpenAIKey,
    hasAnthropicKey: env.hasAnthropicKey,
    hasFirecrawlKey: env.hasFirecrawlKey,
  });

  if (env.demoMode) {
    const metadata = buildMetadata({
      mode: "mock",
      source: "mock",
      demoMode: true,
      providersConfigured,
      providersUsed: ["openai", "gemini", "anthropic"],
      providersSkipped: [],
      toolsUsed: [],
      firecrawlStatus: "skipped",
      successfulProviderCount: 3,
      providerErrors: [],
    });

    logDiagnoseEvent({
      demoMode: env.demoMode,
      hasGeminiKey: env.hasGeminiKey,
      hasFirecrawlKey: env.hasFirecrawlKey,
      selectedMode: "mock",
      providersUsed: metadata.providersUsed,
    });

    return buildMockResponseWithMetadata(request, metadata, []);
  }

  if (!env.hasAnyProviderKey) {
    const fallbackReason =
      "Live provider mode is unavailable because no provider API keys are configured.";
    const metadata = buildMetadata({
      mode: "live",
      source: "mock-fallback",
      demoMode: false,
      providersConfigured,
      providersUsed: ["openai", "gemini", "anthropic"],
      providersSkipped: [],
      toolsUsed: [],
      firecrawlStatus: request.productUrl?.trim()
        ? env.hasFirecrawlKey
          ? "skipped"
          : "unavailable"
        : "skipped",
      successfulProviderCount: 3,
      fallbackReason,
      providerErrors: [],
    });

    logDiagnoseEvent({
      demoMode: env.demoMode,
      hasGeminiKey: env.hasGeminiKey,
      hasFirecrawlKey: env.hasFirecrawlKey,
      selectedMode: "mock-fallback",
      providersUsed: [],
      fallbackReason,
    });

    return buildMockResponseWithMetadata(request, metadata, []);
  }

  let urlContext: string | undefined;
  let firecrawlSuccess = false;
  const serviceErrors: Array<{
    provider: ProviderError["provider"];
    message: string;
  }> = [];

  if (request.productUrl?.trim() && env.hasFirecrawlKey) {
    const firecrawlResult = await extractProductContext(request.productUrl);

    if (firecrawlResult.success) {
      firecrawlSuccess = true;
      urlContext = buildUrlContext(firecrawlResult);
    } else if (firecrawlResult.error) {
      serviceErrors.push({
        provider: "firecrawl",
        message: firecrawlResult.error,
      });
    }
  }

  const firecrawlStatus = getFirecrawlStatus({
    productUrl: request.productUrl,
    hasFirecrawlKey: env.hasFirecrawlKey,
    firecrawlSuccess,
  });

  const providerInput = toProviderInput(request, urlContext);
  const { outputs, errors, skipped } = await runProviders(providerInput);
  serviceErrors.push(...errors);

  const providersSkipped = buildSkippedProviders({
    hasGeminiKey: env.hasGeminiKey,
    hasOpenAIKey: env.hasOpenAIKey,
    hasAnthropicKey: env.hasAnthropicKey,
    providerSkipped: skipped,
  });
  const providerErrors = toReportErrors(serviceErrors);
  const urlContextLength = urlContext?.length;

  if (!outputs.length) {
    const fallbackReason =
      "No live provider returned a usable response, so the seeded mock report was rendered instead.";
    const metadata = buildMetadata({
      mode: "live",
      source: "mock-fallback",
      demoMode: false,
      providersConfigured,
      providersUsed: ["openai", "gemini", "anthropic"],
      providersSkipped: [],
      toolsUsed: firecrawlStatus === "used" ? ["firecrawl"] : [],
      firecrawlStatus,
      successfulProviderCount: 3,
      fallbackReason,
      providerErrors,
      urlContextLength,
    });

    logDiagnoseEvent({
      demoMode: env.demoMode,
      hasGeminiKey: env.hasGeminiKey,
      hasFirecrawlKey: env.hasFirecrawlKey,
      selectedMode: "mock-fallback",
      providersUsed: [],
      fallbackReason,
    });

    return buildMockResponseWithMetadata(request, metadata, providerErrors);
  }

  const effectiveRequest =
    !request.productDescription && urlContext
      ? {
          ...request,
          productDescription: urlContext.slice(0, 600),
        }
      : request;

  const metadata = buildMetadata({
    mode: "live",
    source: selectLiveSource(outputs.map((output) => output.provider)),
    demoMode: false,
    providersConfigured,
    providersUsed: outputs.map((output) => output.provider),
    providersSkipped,
    toolsUsed: firecrawlStatus === "used" ? ["firecrawl"] : [],
    firecrawlStatus,
    successfulProviderCount: outputs.length,
    providerErrors,
    urlContextLength,
  });

  logDiagnoseEvent({
    demoMode: env.demoMode,
    hasGeminiKey: env.hasGeminiKey,
    hasFirecrawlKey: env.hasFirecrawlKey,
    selectedMode: metadata.source,
    providersUsed: metadata.providersUsed,
  });

  return buildDiagnoseResponse({
    request: effectiveRequest,
    rawResponses: toRawResponses(request.targetQuery, outputs),
    source: "live",
    metadata,
    errors: providerErrors,
  });
}
