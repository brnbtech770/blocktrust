// lib/rate-limit-public-failclosed.ts
// Rate limit fail-closed (Redis requis) pour endpoints publics coûteux.
// ============================================================

import type { Ratelimit } from "@upstash/ratelimit";
import {
  getBisVerifyLimiter,
  getResolveTokenLimiter,
  getVerifyHourLimiter,
  getVerifyMinuteLimiter,
  tryRedisLimit,
} from "@/lib/rate-limit-redis";

export const PUBLIC_RATE_LIMIT_503_BODY = {
  error: "service_unavailable",
  message: "Service temporairement indisponible",
} as const;

export type PublicRateLimitOutcome =
  | { ok: true }
  | { ok: false; kind: "unavailable" }
  | { ok: false; kind: "limited"; retryAfter?: number };

async function enforceRedisLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<PublicRateLimitOutcome> {
  if (!limiter) return { ok: false, kind: "unavailable" };
  const result = await tryRedisLimit(limiter, identifier);
  if (result === null) return { ok: false, kind: "unavailable" };
  if (!result.success) {
    return {
      ok: false,
      kind: "limited",
      retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  }
  return { ok: true };
}

/** /api/v2/verify + /api/public/certificate — 10/min + 50/h par IP (Redis obligatoire). */
export async function checkPublicVerifyIpRateLimit(
  ip: string,
): Promise<PublicRateLimitOutcome> {
  const minute = await enforceRedisLimit(getVerifyMinuteLimiter(), ip);
  if (!minute.ok) return minute;
  return enforceRedisLimit(getVerifyHourLimiter(), ip);
}

/** /api/verify/resolve-token — 30/min par IP hash (Redis obligatoire). */
export async function checkPublicResolveTokenRateLimit(
  ipHash: string,
): Promise<PublicRateLimitOutcome> {
  return enforceRedisLimit(getResolveTokenLimiter(), ipHash);
}

/** /api/bis/verify/[id] — 30/min par IP hash (Redis obligatoire). */
export async function checkPublicBisVerifyRateLimit(
  ipHash: string,
): Promise<PublicRateLimitOutcome> {
  return enforceRedisLimit(getBisVerifyLimiter(), ipHash);
}
