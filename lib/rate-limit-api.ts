// lib/rate-limit-api.ts
// Rate limiting des appels API publics White Label : 30 req/min par apiKey.
// ============================================================
//
// Politique :
//   1. Si Upstash Redis configuré → limiteur distribué (recommandé en prod)
//   2. Sinon → fallback in-memory par instance Vercel (dev local, ou Redis KO)
//
// Préférer `checkRateLimitApiAsync` côté nouveau code.

import { tryRedisLimit, getApiLimiter } from "@/lib/rate-limit-redis";

const LIMIT_PER_MINUTE = 30
const WINDOW_MINUTE_MS = 60_000

type Entry = {
  minuteCount: number
  minuteResetAt: number
}

const store = new Map<string, Entry>()

function prune() {
  const now = Date.now()
  for (const [key, e] of store.entries()) {
    if (e.minuteResetAt < now) store.delete(key)
  }
}

export type RateLimitApiResult = {
  ok: boolean
  retryAfter?: number
  remaining: number
  limit: number
}

/**
 * Consomme 1 requête pour cette clé API.
 * @param key — typiquement la valeur `apiKeyHash` (jamais la clé en clair).
 */
export function checkRateLimitApi(key: string): RateLimitApiResult {
  prune()
  const now = Date.now()
  let e = store.get(key)
  if (!e) {
    e = { minuteCount: 0, minuteResetAt: now + WINDOW_MINUTE_MS }
    store.set(key, e)
  }

  if (e.minuteResetAt < now) {
    e.minuteCount = 0
    e.minuteResetAt = now + WINDOW_MINUTE_MS
  }

  if (e.minuteCount >= LIMIT_PER_MINUTE) {
    return {
      ok: false,
      retryAfter: Math.ceil((e.minuteResetAt - now) / 1000),
      remaining: 0,
      limit: LIMIT_PER_MINUTE,
    }
  }

  e.minuteCount += 1
  return {
    ok: true,
    remaining: LIMIT_PER_MINUTE - e.minuteCount,
    limit: LIMIT_PER_MINUTE,
  }
}

/**
 * Variante async : Redis distribué si configuré, sinon fallback in-memory.
 * Même shape de retour que `checkRateLimitApi` pour un drop-in remplacement.
 */
export async function checkRateLimitApiAsync(
  key: string,
): Promise<RateLimitApiResult> {
  const result = await tryRedisLimit(getApiLimiter(), key)

  if (result) {
    if (!result.success) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
        remaining: 0,
        limit: result.limit,
      }
    }
    return {
      ok: true,
      remaining: result.remaining,
      limit: result.limit,
    }
  }

  return checkRateLimitApi(key)
}
