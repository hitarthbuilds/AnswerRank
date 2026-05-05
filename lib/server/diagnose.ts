import "server-only";

import {
  buildDiagnoseResponse,
  createSeededRawResponses,
} from "@/lib/mock-data";
import { runProvider } from "@/lib/providers";
import { extractProductContext } from "@/lib/providers/firecrawl";
import type { ProviderInput } from "@/lib/providers/types";
import { buildProviderRunPolicy } from "@/lib/server/audit-mode";
import { getServerEnv } from "@/lib/server/env";
import { expandBuyerIntentQueries } from "@/lib/server/query-expansion";
import {
  applyCacheStatus,
  buildReportCacheKey,
  getCachedReport,
  getCacheTtlSeconds,
  setCachedReport,
} from "@/lib/server/report-cache";
import { logUsageEvent } from "@/lib/server/usage-log";
import type {
  DiagnoseMetadata,
  DiagnoseRequest,
  DiagnoseResponse,
  ExpandedQuery,
  FirecrawlStatus,
  ProviderError,
  ProviderId,
  RawModelResponse,
} from "@/lib/types";

const ALL_PROVIDERS: ProviderId[] = ["gemini", "openai", "anthropic"];

type DiagnosticStatusStage =
  | "validating"
  | "expanding_queries"
  | "extracting_context"
  | "querying_providers"
  | "scoring"
  | "cached";

export type DiagnosticRunCallbacks = {
  onStatus?: (payload: { stage: DiagnosticStatusStage; message: string }) => void;
  onQueryExpanded?: (queries: ExpandedQuery[]) => void;
  onProviderStart?: (payload: {
    provider: ProviderId;
    queryId: string;
    query: string;
  }) => void;
  onProviderDone?: (payload: {
    provider: ProviderId;
    queryId: string;
    success: boolean;
    skipped?: boolean;
  }) => void;
  onCache?: (payload: { status: "hit" | "miss"; key: string }) => void;
  onResult?: (report: DiagnoseResponse) => void;
};

function toProviderInput(
  request: DiagnoseRequest,
  targetQuery: string,
  urlContext?: string,
): ProviderInput {
  return {
    productName: request.productName,
    productDescription: request.productDescription,
    productUrl: request.productUrl,
    urlContext,
    targetQuery,
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
  allowedProviders: ProviderId[];
  providersUsed: ProviderId[];
  missingProviders: ProviderId[];
  explicitlySkipped: ProviderId[];
}) {
  return ALL_PROVIDERS.filter(
    (provider) =>
      !input.providersUsed.includes(provider) &&
      (!input.allowedProviders.includes(provider) ||
        input.missingProviders.includes(provider) ||
        input.explicitlySkipped.includes(provider)),
  );
}

function buildMetadata(input: {
  mode: DiagnoseMetadata["mode"];
  source: DiagnoseMetadata["source"];
  auditMode: DiagnoseMetadata["auditMode"];
  demoMode: boolean;
  providersConfigured: string[];
  providersUsed: ProviderId[];
  providersSkipped: ProviderId[];
  toolsUsed: string[];
  toolsAttempted: string[];
  firecrawlStatus: FirecrawlStatus;
  successfulProviderCount: number;
  cacheStatus: DiagnoseMetadata["cacheStatus"];
  fallbackReason?: string;
  providerErrors?: ProviderError[];
  urlContextLength?: number;
}): DiagnoseMetadata {
  return {
    mode: input.mode,
    source: input.source,
    auditMode: input.auditMode,
    demoMode: input.demoMode,
    providersConfigured: Array.from(new Set(input.providersConfigured)),
    providersUsed: Array.from(new Set(input.providersUsed)),
    providersSkipped: Array.from(new Set(input.providersSkipped)),
    toolsUsed: Array.from(new Set(input.toolsUsed)),
    toolsAttempted: Array.from(new Set(input.toolsAttempted)),
    firecrawlStatus: input.firecrawlStatus,
    cacheStatus: input.cacheStatus,
    expectedProviderCount: 3,
    successfulProviderCount: input.successfulProviderCount,
    providerCoverageRatio: input.successfulProviderCount / 3,
    sampledScore: 0,
    coverageAdjusted: input.successfulProviderCount < 3,
    fallbackReason: input.fallbackReason,
    providerErrors: input.providerErrors ?? [],
    urlContextLength: input.urlContextLength,
  };
}

function selectLiveSource(providersUsed: ProviderId[]) {
  const providerSet = new Set(providersUsed);

  if (
    providerSet.has("openai") &&
    providerSet.has("gemini") &&
    providerSet.has("anthropic")
  ) {
    return "full-live" as const;
  }

  if (providersUsed.length === 1 && providerSet.has("gemini")) {
    return "gemini-live" as const;
  }

  return "live-partial" as const;
}

function logDiagnoseEvent(input: {
  demoMode: boolean;
  hasGeminiKey: boolean;
  hasFirecrawlKey: boolean;
  selectedMode: string;
  providersUsed: ProviderId[];
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

function createMockRawResponses(
  request: DiagnoseRequest,
  expandedQueries: ExpandedQuery[],
) {
  return expandedQueries.flatMap((expandedQuery) =>
    createSeededRawResponses(expandedQuery.query, {
      ...request,
      targetQuery: expandedQuery.query,
    }).map((response) => ({
      ...response,
      query: expandedQuery.query,
      queryId: expandedQuery.id,
      intent: expandedQuery.intent,
    })),
  );
}

function buildMockResponseWithMetadata(
  request: DiagnoseRequest,
  expandedQueries: ExpandedQuery[],
  metadata: Partial<DiagnoseMetadata>,
  errors: ProviderError[],
) {
  return buildDiagnoseResponse({
    request,
    expandedQueries,
    rawResponses: createMockRawResponses(request, expandedQueries),
    source: "mock",
    metadata,
    errors,
  });
}

function cloneReport(report: DiagnoseResponse) {
  return structuredClone(report);
}

export async function generateDiagnoseResponse(
  request: DiagnoseRequest,
  callbacks: DiagnosticRunCallbacks = {},
): Promise<DiagnoseResponse> {
  const env = getServerEnv();
  const policy = buildProviderRunPolicy({
    requestedMode: request.auditMode,
    fullAuditEnabled: env.fullAuditEnabled,
    hasGeminiKey: env.hasGeminiKey,
    hasOpenAIKey: env.hasOpenAIKey,
    hasAnthropicKey: env.hasAnthropicKey,
  });
  const providersConfigured = buildConfiguredServices({
    hasGeminiKey: env.hasGeminiKey,
    hasOpenAIKey: env.hasOpenAIKey,
    hasAnthropicKey: env.hasAnthropicKey,
    hasFirecrawlKey: env.hasFirecrawlKey,
  });

  callbacks.onStatus?.({
    stage: "expanding_queries",
    message: "Expanding buyer-intent query cluster",
  });
  const queryExpansion = await expandBuyerIntentQueries({
    request: { ...request, auditMode: policy.mode },
    mode: policy.mode,
    maxQueries: policy.maxQueries,
  });
  callbacks.onQueryExpanded?.(queryExpansion.expandedQueries);

  const cacheKey = await buildReportCacheKey({
    request: { ...request, auditMode: policy.mode },
    auditMode: policy.mode,
    expandedQueryCount: queryExpansion.expandedQueries.length,
    allowedProviders: policy.allowedProviders,
  });
  const cached = await getCachedReport(cacheKey);

  if (cached) {
    callbacks.onCache?.({ status: "hit", key: cacheKey });
    callbacks.onStatus?.({
      stage: "cached",
      message: "Using cached diagnostic result",
    });
    const cachedReport = cloneReport(cached);
    applyCacheStatus(cachedReport, "hit");
    logUsageEvent({
      route: "/api/diagnose",
      auditMode: policy.mode,
      productName: request.productName,
      buyerIntentQuery: request.targetQuery,
      expandedQueryCount: queryExpansion.expandedQueries.length,
      providersUsed: cachedReport.metadata.providersUsed as ProviderId[],
      providersSkipped: cachedReport.metadata.providersSkipped as ProviderId[],
      cacheStatus: "hit",
      success: true,
      leadEmail: request.leadEmail,
    });
    callbacks.onResult?.(cachedReport);
    return cachedReport;
  }

  callbacks.onCache?.({ status: "miss", key: cacheKey });

  if (env.demoMode) {
    const metadata = buildMetadata({
      mode: "mock",
      source: "mock",
      auditMode: policy.mode,
      demoMode: true,
      providersConfigured,
      providersUsed: ["openai", "gemini", "anthropic"],
      providersSkipped: [],
      toolsUsed: [],
      toolsAttempted: [],
      firecrawlStatus: "skipped",
      successfulProviderCount: 3,
      cacheStatus: "miss",
      providerErrors: [],
    });

    logDiagnoseEvent({
      demoMode: env.demoMode,
      hasGeminiKey: env.hasGeminiKey,
      hasFirecrawlKey: env.hasFirecrawlKey,
      selectedMode: "mock",
      providersUsed: ["openai", "gemini", "anthropic"],
    });

    const report = buildMockResponseWithMetadata(
      { ...request, auditMode: policy.mode },
      queryExpansion.expandedQueries,
      metadata,
      [],
    );
    logUsageEvent({
      route: "/api/diagnose",
      auditMode: policy.mode,
      productName: request.productName,
      buyerIntentQuery: request.targetQuery,
      expandedQueryCount: queryExpansion.expandedQueries.length,
      providersUsed: ["openai", "gemini", "anthropic"],
      providersSkipped: [],
      cacheStatus: "miss",
      success: true,
      leadEmail: request.leadEmail,
    });
    await setCachedReport(
      cacheKey,
      report,
      getCacheTtlSeconds({ auditMode: policy.mode, source: report.source }),
    );
    callbacks.onResult?.(report);
    return report;
  }

  if (!policy.allowedProviders.length) {
    const fallbackReason =
      "Live provider mode is unavailable because no provider is configured for the current audit mode.";
    const providersSkipped = buildSkippedProviders({
      allowedProviders: policy.allowedProviders,
      providersUsed: [],
      missingProviders: ALL_PROVIDERS.filter(
        (provider) =>
          (provider === "gemini" && !env.hasGeminiKey) ||
          (provider === "openai" && !env.hasOpenAIKey) ||
          (provider === "anthropic" && !env.hasAnthropicKey),
      ),
      explicitlySkipped: [],
    });
    const metadata = buildMetadata({
      mode: "live",
      source: "mock-fallback",
      auditMode: policy.mode,
      demoMode: false,
      providersConfigured,
      providersUsed: [],
      providersSkipped,
      toolsUsed: [],
      toolsAttempted: [],
      firecrawlStatus: request.productUrl?.trim()
        ? env.hasFirecrawlKey
          ? "skipped"
          : "unavailable"
        : "skipped",
      successfulProviderCount: 0,
      cacheStatus: "miss",
      fallbackReason,
      providerErrors: [],
    });

    const report = buildMockResponseWithMetadata(
      { ...request, auditMode: policy.mode },
      queryExpansion.expandedQueries,
      metadata,
      [],
    );
    logUsageEvent({
      route: "/api/diagnose",
      auditMode: policy.mode,
      productName: request.productName,
      buyerIntentQuery: request.targetQuery,
      expandedQueryCount: queryExpansion.expandedQueries.length,
      providersUsed: [],
      providersSkipped,
      cacheStatus: "miss",
      success: false,
      errorType: "no_provider_available",
      leadEmail: request.leadEmail,
    });
    callbacks.onResult?.(report);
    return report;
  }

  callbacks.onStatus?.({
    stage: "extracting_context",
    message: "Extracting product-page context",
  });

  let urlContext: string | undefined;
  let firecrawlSuccess = false;
  const firecrawlAttempted = Boolean(
    request.productUrl?.trim() && env.hasFirecrawlKey,
  );
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

  callbacks.onStatus?.({
    stage: "querying_providers",
    message: "Checking AI answer visibility",
  });

  const outputs: RawModelResponse[] = [];
  const skippedProviders = new Set<ProviderId>();

  for (const expandedQuery of queryExpansion.expandedQueries) {
    const providerInput = toProviderInput(
      request,
      expandedQuery.query,
      urlContext,
    );

    const results = await Promise.all(
      policy.allowedProviders.map(async (provider) => {
        callbacks.onProviderStart?.({
          provider,
          queryId: expandedQuery.id,
          query: expandedQuery.query,
        });
        const result = await runProvider(provider, providerInput);

        if (result.ok) {
          outputs.push({
            provider: result.output.provider,
            response: result.output.rawResponse,
            query: expandedQuery.query,
            queryId: expandedQuery.id,
            intent: expandedQuery.intent,
          });
          callbacks.onProviderDone?.({
            provider,
            queryId: expandedQuery.id,
            success: true,
          });
          return;
        }

        if ("skipped" in result) {
          skippedProviders.add(provider);
          callbacks.onProviderDone?.({
            provider,
            queryId: expandedQuery.id,
            success: false,
            skipped: true,
          });
          return;
        }

        serviceErrors.push(result.error);
        callbacks.onProviderDone?.({
          provider,
          queryId: expandedQuery.id,
          success: false,
        });
      }),
    );

    void results;
  }

  const providersUsed = Array.from(
    new Set(outputs.map((output) => output.provider)),
  );
  const providersSkipped = buildSkippedProviders({
    allowedProviders: policy.allowedProviders,
    providersUsed,
    missingProviders: ALL_PROVIDERS.filter(
      (provider) =>
        (provider === "gemini" && !env.hasGeminiKey) ||
        (provider === "openai" && !env.hasOpenAIKey) ||
        (provider === "anthropic" && !env.hasAnthropicKey),
    ),
    explicitlySkipped: [...skippedProviders],
  });
  const providerErrors = toReportErrors(serviceErrors);
  const urlContextLength = urlContext?.length;

  if (!outputs.length) {
    const fallbackReason =
      "No live provider returned a usable response, so the seeded mock report was rendered instead.";
    const metadata = buildMetadata({
      mode: "live",
      source: "mock-fallback",
      auditMode: policy.mode,
      demoMode: false,
      providersConfigured,
      providersUsed: [],
      providersSkipped,
      toolsUsed: firecrawlStatus === "used" ? ["firecrawl"] : [],
      toolsAttempted: firecrawlAttempted ? ["firecrawl"] : [],
      firecrawlStatus,
      successfulProviderCount: 0,
      cacheStatus: "miss",
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

    const report = buildMockResponseWithMetadata(
      { ...request, auditMode: policy.mode },
      queryExpansion.expandedQueries,
      metadata,
      providerErrors,
    );
    logUsageEvent({
      route: "/api/diagnose",
      auditMode: policy.mode,
      productName: request.productName,
      buyerIntentQuery: request.targetQuery,
      expandedQueryCount: queryExpansion.expandedQueries.length,
      providersUsed: [],
      providersSkipped,
      providersFailed: providerErrors.map((error) => error.provider),
      cacheStatus: "miss",
      success: false,
      errorType: "all_providers_failed",
      leadEmail: request.leadEmail,
    });
    callbacks.onResult?.(report);
    return report;
  }

  callbacks.onStatus?.({
    stage: "scoring",
    message: "Calculating AI visibility score",
  });

  const effectiveRequest =
    !request.productDescription && urlContext
      ? {
          ...request,
          productDescription: urlContext.slice(0, 600),
          auditMode: policy.mode,
        }
      : { ...request, auditMode: policy.mode };

  const metadata = buildMetadata({
    mode: "live",
    source: selectLiveSource(providersUsed),
    auditMode: policy.mode,
    demoMode: false,
    providersConfigured,
    providersUsed,
    providersSkipped,
    toolsUsed: firecrawlStatus === "used" ? ["firecrawl"] : [],
    toolsAttempted: firecrawlAttempted ? ["firecrawl"] : [],
    firecrawlStatus,
    successfulProviderCount: providersUsed.length,
    cacheStatus: "miss",
    providerErrors,
    urlContextLength,
  });

  const report = buildDiagnoseResponse({
    request: effectiveRequest,
    expandedQueries: queryExpansion.expandedQueries,
    rawResponses: outputs,
    source: "live",
    metadata,
    errors: providerErrors,
  });

  await setCachedReport(
    cacheKey,
    report,
    getCacheTtlSeconds({ auditMode: policy.mode, source: report.source }),
  );

  logDiagnoseEvent({
    demoMode: env.demoMode,
    hasGeminiKey: env.hasGeminiKey,
    hasFirecrawlKey: env.hasFirecrawlKey,
    selectedMode: metadata.source,
    providersUsed,
  });
  logUsageEvent({
    route: "/api/diagnose",
    auditMode: policy.mode,
    productName: request.productName,
    buyerIntentQuery: request.targetQuery,
    expandedQueryCount: queryExpansion.expandedQueries.length,
    providersUsed,
    providersSkipped,
    providersFailed: providerErrors.map((error) => error.provider),
    cacheStatus: "miss",
    success: true,
    leadEmail: request.leadEmail,
  });

  callbacks.onResult?.(report);
  return report;
}
