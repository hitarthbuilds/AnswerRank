import "server-only";

import { createHash } from "node:crypto";

type RateLimitOptions = {
  route: string;
  limit: number;
  windowMs: number;
  email?: string;
};

type InMemoryRecord = {
  count: number;
  expiresAt: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  provider: "upstash" | "memory";
};

type GlobalRateLimitStore = typeof globalThis & {
  __answerrankRateLimitStore?: Map<string, InMemoryRecord>;
};

const globalRateLimitStore = globalThis as GlobalRateLimitStore;

function getMemoryStore() {
  if (!globalRateLimitStore.__answerrankRateLimitStore) {
    globalRateLimitStore.__answerrankRateLimitStore = new Map();
  }

  return globalRateLimitStore.__answerrankRateLimitStore;
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function buildRateLimitKey(request: Request, options: RateLimitOptions) {
  const ipHash = hashValue(getClientIp(request));
  const emailHash = options.email ? hashValue(options.email.toLowerCase()) : "";
  const bucket = Math.floor(Date.now() / options.windowMs);

  return `${options.route}:${bucket}:${ipHash}${emailHash ? `:${emailHash}` : ""}`;
}

async function runMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const store = getMemoryStore();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.expiresAt <= now) {
    store.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });

    return {
      ok: true,
      remaining: Math.max(limit - 1, 0),
      resetAt: now + windowMs,
      provider: "memory",
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    ok: existing.count <= limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.expiresAt,
    provider: "memory",
  };
}

async function runUpstashRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  url: string,
  token: string,
) {
  const ttlSeconds = Math.ceil((windowMs * 2) / 1000);
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, ttlSeconds],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit failed with ${response.status}.`);
  }

  const payload = (await response.json()) as Array<{ result?: unknown }>;
  const count = Number(payload[0]?.result ?? 0);

  return {
    ok: count <= limit,
    remaining: Math.max(limit - count, 0),
    resetAt: Date.now() + windowMs,
    provider: "upstash" as const,
  };
}

export class RateLimitError extends Error {
  status = 429;

  constructor() {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

export async function rateLimitOrThrow(
  request: Request,
  options: RateLimitOptions,
) {
  const key = buildRateLimitKey(request, options);
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  let result: RateLimitResult;

  if (redisUrl && redisToken) {
    try {
      result = await runUpstashRateLimit(
        key,
        options.limit,
        options.windowMs,
        redisUrl,
        redisToken,
      );
    } catch (error) {
      console.warn("[rate-limit] Falling back to in-memory limiter.", {
        route: options.route,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      result = await runMemoryRateLimit(key, options.limit, options.windowMs);
    }
  } else {
    result = await runMemoryRateLimit(key, options.limit, options.windowMs);
  }

  if (!result.ok) {
    throw new RateLimitError();
  }

  return result;
}
