import type { ProviderId } from "@/lib/types";

export type ProviderInput = {
  productName: string;
  productDescription?: string;
  productUrl?: string;
  urlContext?: string;
  targetQuery: string;
  competitors?: string[];
  audience?: string;
  region?: string;
};

export type ProviderOutput = {
  provider: ProviderId;
  rawResponse: string;
};

export type ProviderError = {
  provider: ProviderId;
  message: string;
};

export type ProviderResult =
  | { ok: true; output: ProviderOutput }
  | { ok: false; error: ProviderError }
  | { ok: false; skipped: true; provider: ProviderId };
