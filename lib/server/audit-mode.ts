import type { AuditMode, CoverageLevel, ProviderId } from "@/lib/types";
import {
  FREE_MAX_EXPANDED_QUERIES,
  FREE_MAX_PROVIDERS,
  FULL_MAX_EXPANDED_QUERIES,
  FULL_MAX_PROVIDERS,
} from "@/lib/server/limits";

export type ProviderRunPolicy = {
  mode: AuditMode;
  allowedProviders: ProviderId[];
  maxQueries: number;
  requirePayment?: boolean;
};

export function parseBooleanEnv(value: string | undefined, fallback = false) {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

export function resolveAuditMode(
  requestedMode: AuditMode | undefined,
  fullAuditEnabled: boolean,
): AuditMode {
  if (requestedMode === "full" && fullAuditEnabled) {
    return "full";
  }

  return "free";
}

type PolicyInput = {
  requestedMode?: AuditMode;
  fullAuditEnabled: boolean;
  hasGeminiKey: boolean;
  hasOpenAIKey: boolean;
  hasAnthropicKey: boolean;
};

export function buildProviderRunPolicy({
  requestedMode,
  fullAuditEnabled,
  hasGeminiKey,
  hasOpenAIKey,
  hasAnthropicKey,
}: PolicyInput): ProviderRunPolicy {
  const mode = resolveAuditMode(requestedMode, fullAuditEnabled);

  if (mode === "full") {
    const allowedProviders: ProviderId[] = [];

    if (hasGeminiKey) {
      allowedProviders.push("gemini");
    }

    if (hasOpenAIKey) {
      allowedProviders.push("openai");
    }

    if (hasAnthropicKey) {
      allowedProviders.push("anthropic");
    }

    return {
      mode,
      allowedProviders,
      maxQueries: FULL_MAX_EXPANDED_QUERIES,
      requirePayment: true,
    };
  }

  return {
    mode: "free",
    allowedProviders: hasGeminiKey ? ["gemini"] : [],
    maxQueries: FREE_MAX_EXPANDED_QUERIES,
  };
}

export function getCoverageLevel(successfulProviderCount: number): CoverageLevel {
  if (successfulProviderCount >= FULL_MAX_PROVIDERS) {
    return "tri-engine";
  }

  if (successfulProviderCount >= 2) {
    return "partial";
  }

  return "sample";
}

export function getProviderCountLimit(mode: AuditMode) {
  return mode === "full" ? FULL_MAX_PROVIDERS : FREE_MAX_PROVIDERS;
}
