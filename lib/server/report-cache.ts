import "server-only";

import { createHash } from "node:crypto";
import type { AuditMode, CacheStatus, DiagnoseRequest, DiagnoseResponse, ProviderId } from "@/lib/types";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

type GlobalCacheStore = typeof globalThis & {
  __answerrankReportCache?: Map<string, CacheRecord<DiagnoseResponse>>;
};

const globalCacheStore = globalThis as GlobalCacheStore;

function getMemoryCache() {
  if (!globalCacheStore.__answerrankReportCache) {
    globalCacheStore.__answerrankReportCache = new Map();
  }

  return globalCacheStore.__answerrankReportCache;
}

function normalizeRequestField(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).sort();
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value ?? null;
}

export async function buildReportCacheKey(input: {
  request: DiagnoseRequest;
  auditMode: AuditMode;
  expandedQueryCount: number;
  allowedProviders: ProviderId[];
}) {
  const payload = {
    productName: normalizeRequestField(input.request.productName),
    productUrl: normalizeRequestField(input.request.productUrl),
    productDescription: normalizeRequestField(input.request.productDescription),
    targetQuery: normalizeRequestField(input.request.targetQuery),
    competitors: normalizeRequestField(input.request.competitors),
    audience: normalizeRequestField(input.request.audience),
    region: normalizeRequestField(input.request.region),
    auditMode: input.auditMode,
    expandedQueryCount: input.expandedQueryCount,
    allowedProviders: [...input.allowedProviders].sort(),
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

async function runRedisGet<T>(key: string): Promise<T | null> {
  const config = getRedisConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([["GET", key]]),
  });

  if (!response.ok) {
    throw new Error(`Upstash cache get failed with ${response.status}.`);
  }

  const payload = (await response.json()) as Array<{ result?: string | null }>;
  const rawValue = payload[0]?.result;

  return rawValue ? (JSON.parse(rawValue) as T) : null;
}

async function runRedisSet<T>(key: string, value: T, ttlSeconds: number) {
  const config = getRedisConfig();

  if (!config) {
    return;
  }

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["SET", key, JSON.stringify(value)],
      ["EXPIRE", key, ttlSeconds],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Upstash cache set failed with ${response.status}.`);
  }
}

export function getCacheTtlSeconds(input: {
  auditMode: AuditMode;
  source: DiagnoseResponse["source"];
}) {
  if (input.source === "mock") {
    return 60 * 60 * 24;
  }

  return input.auditMode === "full" ? 60 * 60 * 24 : 60 * 60 * 6;
}

export async function getCachedReport(key: string) {
  try {
    const cached = await runRedisGet<DiagnoseResponse>(key);

    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn("[cache] Falling back to in-memory cache.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const cache = getMemoryCache();
  const record = cache.get(key);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return record.value;
}

export async function setCachedReport(
  key: string,
  value: DiagnoseResponse,
  ttlSeconds: number,
) {
  try {
    await runRedisSet(key, value, ttlSeconds);
  } catch (error) {
    console.warn("[cache] Falling back to in-memory cache.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const cache = getMemoryCache();
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function applyCacheStatus(
  report: DiagnoseResponse,
  cacheStatus: CacheStatus,
) {
  report.metadata.cacheStatus = cacheStatus;
  return report;
}
