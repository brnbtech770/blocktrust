// lib/rate-limit-extension.ts
// Rate limit pour les routes /api/extension/* — Redis si dispo, sinon mémoire.
// ============================================================

import {
  getExtensionVerifyLimiter,
  getExtensionWriteLimiter,
  getExtensionMeLimiter,
  getExtensionKeygenLimiter,
  tryRedisLimit,
} from "@/lib/rate-limit-redis";
import type { RateLimitApiResult } from "@/lib/rate-limit-api";

const windows = {
  verify: { limit: 100, windowMs: 60_000 },
  write: { limit: 30, windowMs: 60_000 },
  me: { limit: 60, windowMs: 60_000 },
  keygen: { limit: 10, windowMs: 60_000 },
} as const;

type ExtensionLimitKind = keyof typeof windows;

const memory = new Map<string, { count: number; resetAt: number }>();

function checkMemory(key: string, kind: ExtensionLimitKind): RateLimitApiResult {
  const { limit, windowMs } = windows[kind];
  const now = Date.now();
  let e = memory.get(key);
  if (!e || e.resetAt < now) {
    e = { count: 0, resetAt: now + windowMs };
    memory.set(key, e);
  }
  if (e.count >= limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((e.resetAt - now) / 1000)),
      remaining: 0,
      limit,
    };
  }
  e.count += 1;
  return { ok: true, remaining: limit - e.count, limit };
}

function limiterFor(kind: ExtensionLimitKind) {
  switch (kind) {
    case "verify":
      return getExtensionVerifyLimiter();
    case "write":
      return getExtensionWriteLimiter();
    case "me":
      return getExtensionMeLimiter();
    case "keygen":
      return getExtensionKeygenLimiter();
  }
}

export async function checkRateLimitExtensionAsync(
  kind: ExtensionLimitKind,
  identifier: string,
): Promise<RateLimitApiResult> {
  const redisLimiter = limiterFor(kind);
  const redisResult = await tryRedisLimit(redisLimiter, identifier);
  if (redisResult) {
    if (!redisResult.success) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((redisResult.reset - Date.now()) / 1000)),
        remaining: 0,
        limit: redisResult.limit,
      };
    }
    return { ok: true, remaining: redisResult.remaining, limit: redisResult.limit };
  }
  return checkMemory(`${kind}:${identifier}`, kind);
}
