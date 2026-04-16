// lib/rate-limit-register.ts
// Limite inscriptions : 3 / heure / IP, 10 / jour / IP (mémoire par instance).
// ============================================================

const LIMIT_PER_HOUR = 3
const WINDOW_HOUR_MS = 3_600_000
const LIMIT_PER_DAY = 10
const WINDOW_DAY_MS = 86_400_000

type Entry = {
  hourCount: number
  hourResetAt: number
  dayCount: number
  dayResetAt: number
}

const store = new Map<string, Entry>()

function prune() {
  const now = Date.now()
  for (const [key, e] of store.entries()) {
    if (e.hourResetAt < now && e.dayResetAt < now) store.delete(key)
  }
}

function initEntry(now: number): Entry {
  return {
    hourCount: 0,
    hourResetAt: now + WINDOW_HOUR_MS,
    dayCount: 0,
    dayResetAt: now + WINDOW_DAY_MS,
  }
}

export type RateLimitRegisterResult = {
  ok: boolean
  retryAfter?: number
}

export function checkRateLimitRegister(ip: string): RateLimitRegisterResult {
  prune()
  const now = Date.now()
  let e = store.get(ip)
  if (!e) {
    e = initEntry(now)
    store.set(ip, e)
  }

  if (e.hourResetAt < now) {
    e.hourCount = 0
    e.hourResetAt = now + WINDOW_HOUR_MS
  }
  if (e.dayResetAt < now) {
    e.dayCount = 0
    e.dayResetAt = now + WINDOW_DAY_MS
  }

  if (e.hourCount >= LIMIT_PER_HOUR) {
    return {
      ok: false,
      retryAfter: Math.ceil((e.hourResetAt - now) / 1000),
    }
  }
  if (e.dayCount >= LIMIT_PER_DAY) {
    return {
      ok: false,
      retryAfter: Math.ceil((e.dayResetAt - now) / 1000),
    }
  }

  e.hourCount += 1
  e.dayCount += 1

  return { ok: true }
}
