// lib/rate-limit-verify.ts
// Rate limiting 20 req/min par IP pour la page publique /verify/[id]
// ============================================================
//
// ⚠️ Rate limit en mémoire — par instance Vercel uniquement.
// Sur plusieurs instances (prod à charge), contournable.
// TODO : migrer vers Upstash Redis avant 100 users actifs.
// Doc : https://docs.upstash.com/redis/sdks/ratelimit
//

const LIMIT = 20
const WINDOW_MS = 60_000

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

function prune() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}

export function checkRateLimitVerify(ip: string): { ok: boolean; retryAfter?: number } {
  prune()
  const now = Date.now()
  let entry = store.get(ip)
  if (!entry) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }
  if (entry.resetAt < now) {
    entry = { count: 1, resetAt: now + WINDOW_MS }
    store.set(ip, entry)
    return { ok: true }
  }
  if (entry.count >= LIMIT) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count += 1
  return { ok: true }
}
