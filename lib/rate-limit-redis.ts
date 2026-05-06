// lib/rate-limit-redis.ts
// Rate limiting distribué via Upstash Redis (sliding window, analytics).
// Si Redis n'est pas configuré OU répond en erreur → null retourné, le caller doit fallback.
// ============================================================
//
// Variables Vercel attendues :
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// Politique : fail-soft. Jamais bloquer une requête légitime à cause de Redis KO.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const isRedisConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

/** Client Redis partagé — null si non configuré (fail-soft côté appelants). */
export const redis: Redis | null = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const isUpstashConfigured = isRedisConfigured;

function makeLimiter(
  tokens: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
  prefix: string,
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix,
  });
}

// /verify : 10 req / min par IP — fenêtre courte
export const verifyMinuteLimiter = makeLimiter(10, "1 m", "bt:verify:m");
// /verify : 50 req / h par IP — fenêtre longue
export const verifyHourLimiter = makeLimiter(50, "1 h", "bt:verify:h");

// API publique White Label : 30 req / min par apiKeyHash
export const apiLimiter = makeLimiter(30, "1 m", "bt:api");

// Inscription : 3 req / h par IP — fenêtre courte
export const registerHourLimiter = makeLimiter(3, "1 h", "bt:register:h");
// Inscription : 10 req / jour par IP — fenêtre longue
export const registerDayLimiter = makeLimiter(10, "1 d", "bt:register:d");

export type RedisLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

/**
 * Tente une requête de rate limit Redis. Retourne null si Redis n'est pas configuré
 * ou si l'appel échoue — le caller doit alors basculer sur le fallback in-memory.
 */
export async function tryRedisLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RedisLimitResult | null> {
  if (!limiter) return null;
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    };
  } catch (err) {
    console.warn("[RateLimit] Upstash KO, fallback in-memory", err);
    return null;
  }
}
