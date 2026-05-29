// lib/rate-limit-verify.ts
// Rate limiting /verify : 10 req/min et 50 req/h par IP.
// ============================================================
//
// Politique :
//   1. Si Upstash Redis configuré → limiteur distribué (recommandé en prod)
//   2. Sinon → fallback in-memory par instance Vercel (dev local, ou Redis KO)
//
// La fonction sync `checkRateLimitVerify` reste exposée pour rétrocompat.
// Préférer `checkRateLimitVerifyAsync` côté nouveau code.

import type { Ratelimit } from "@upstash/ratelimit";
import {
  tryRedisLimit,
  getVerifyMinuteLimiter,
  getVerifyHourLimiter,
  getMagicLinkHourLimiter,
} from "@/lib/rate-limit-redis";

const LIMIT_PER_MINUTE = 10
const WINDOW_MINUTE_MS = 60_000
const LIMIT_PER_HOUR = 50
const WINDOW_HOUR_MS = 3_600_000

type Entry = {
  minuteCount: number
  minuteResetAt: number
  hourCount: number
  hourResetAt: number
}

const store = new Map<string, Entry>()

function prune() {
  const now = Date.now()
  for (const [key, e] of store.entries()) {
    if (e.minuteResetAt < now && e.hourResetAt < now) store.delete(key)
  }
}

function initEntry(now: number): Entry {
  return {
    minuteCount: 0,
    minuteResetAt: now + WINDOW_MINUTE_MS,
    hourCount: 0,
    hourResetAt: now + WINDOW_HOUR_MS,
  }
}

export type RateLimitVerifyResult = {
  ok: boolean
  retryAfter?: number
  /** Minimum des crédits restants (minute vs heure), après la requête si ok */
  remaining: number
}

/**
 * Consomme 1 requête pour cette IP si les deux fenêtres le permettent.
 */
export function checkRateLimitVerify(ip: string): RateLimitVerifyResult {
  prune()
  const now = Date.now()
  let e = store.get(ip)
  if (!e) {
    e = initEntry(now)
    store.set(ip, e)
  }

  if (e.minuteResetAt < now) {
    e.minuteCount = 0
    e.minuteResetAt = now + WINDOW_MINUTE_MS
  }
  if (e.hourResetAt < now) {
    e.hourCount = 0
    e.hourResetAt = now + WINDOW_HOUR_MS
  }

  if (e.minuteCount >= LIMIT_PER_MINUTE) {
    return {
      ok: false,
      retryAfter: Math.ceil((e.minuteResetAt - now) / 1000),
      remaining: 0,
    }
  }
  if (e.hourCount >= LIMIT_PER_HOUR) {
    return {
      ok: false,
      retryAfter: Math.ceil((e.hourResetAt - now) / 1000),
      remaining: 0,
    }
  }

  e.minuteCount += 1
  e.hourCount += 1

  const remMinute = LIMIT_PER_MINUTE - e.minuteCount
  const remHour = LIMIT_PER_HOUR - e.hourCount
  const remaining = Math.min(remMinute, remHour)

  return { ok: true, remaining }
}

/**
 * Variante async : Redis distribué si configuré, sinon fallback in-memory.
 * Même shape de retour que `checkRateLimitVerify` pour un drop-in remplacement.
 */
export async function checkRateLimitVerifyAsync(
  ip: string,
): Promise<RateLimitVerifyResult> {
  const minute = await tryRedisLimit(getVerifyMinuteLimiter(), ip)
  const hour = await tryRedisLimit(getVerifyHourLimiter(), ip)

  if (minute && hour) {
    if (!minute.success) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((minute.reset - Date.now()) / 1000)),
        remaining: 0,
      }
    }
    if (!hour.success) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((hour.reset - Date.now()) / 1000)),
        remaining: 0,
      }
    }
    return {
      ok: true,
      remaining: Math.min(minute.remaining, hour.remaining),
    }
  }

  return checkRateLimitVerify(ip)
}

// --- Magic link (NextAuth provider id "email") : 3 tentatives / heure / identifiant ---

/** Limiteur partagé magic link (lazy ; Redis si configuré, sinon mémoire via checkRateLimit). */
export const getAuthRatelimit = (): Ratelimit | null => getMagicLinkHourLimiter();

const MAGIC_AUTH_LIMIT_PER_HOUR = 3;
const MAGIC_AUTH_WINDOW_MS = 3_600_000;

const magicAuthStore = new Map<string, { count: number; resetAt: number }>();

function pruneMagicAuth() {
  const now = Date.now();
  for (const [k, e] of magicAuthStore.entries()) {
    if (e.resetAt < now) magicAuthStore.delete(k);
  }
}

function checkMagicAuthMemory(identifier: string): { limited: boolean } {
  pruneMagicAuth();
  const now = Date.now();
  let e = magicAuthStore.get(identifier);
  if (!e || e.resetAt < now) {
    magicAuthStore.set(identifier, {
      count: 1,
      resetAt: now + MAGIC_AUTH_WINDOW_MS,
    });
    return { limited: false };
  }
  if (e.count >= MAGIC_AUTH_LIMIT_PER_HOUR) {
    return { limited: true };
  }
  e.count += 1;
  return { limited: false };
}

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ limited: boolean }> {
  const redisResult = await tryRedisLimit(limiter, identifier);
  if (redisResult !== null) {
    return { limited: !redisResult.success };
  }
  return checkMagicAuthMemory(identifier);
}
