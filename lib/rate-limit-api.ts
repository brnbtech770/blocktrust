// lib/rate-limit-api.ts
// Rate limiting des appels API publics White Label : 30 req/min par apiKey.
// ============================================================
//
// ⚠️ Limite en mémoire — par instance Vercel uniquement.
// TODO : Upstash Redis en production multi-instances.
//

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
