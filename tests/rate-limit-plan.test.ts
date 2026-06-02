import { describe, it, expect } from 'vitest'
import {
  planTier,
  getRateLimitForPlan,
  checkPlanRateLimit,
} from '@/lib/rate-limit-plan'

// NB : aucune variable UPSTASH_* n'est définie en test → getRedis() renvoie null
// → tryRedisLimit renvoie null → on exerce le fallback in-memory conservateur.
// On utilise des identifiants uniques par test pour éviter toute contamination
// (le compteur in-memory est un Map au niveau module).

describe('rate-limit-plan — planTier', () => {
  it('DISCOVERY et DISCOVERY_EXPIRED → tier strict DISCOVERY', () => {
    expect(planTier('DISCOVERY')).toBe('DISCOVERY')
    expect(planTier('DISCOVERY_EXPIRED')).toBe('DISCOVERY')
  })

  it('plans payants / admin / inconnu → tier généreux PAID', () => {
    expect(planTier('PREMIUM')).toBe('PAID')
    expect(planTier('B2B_ENTERPRISE')).toBe('PAID')
    expect(planTier(null)).toBe('PAID')
    expect(planTier(undefined)).toBe('PAID')
  })
})

describe('rate-limit-plan — getRateLimitForPlan (matrice)', () => {
  it('limites strictes pour DISCOVERY', () => {
    expect(getRateLimitForPlan('DISCOVERY', 'verify')).toEqual({ limit: 10, windowMs: 60_000 })
    expect(getRateLimitForPlan('DISCOVERY', 'extension')).toEqual({ limit: 30, windowMs: 60_000 })
    expect(getRateLimitForPlan('DISCOVERY', 'contacts')).toEqual({ limit: 5, windowMs: 60_000 })
  })

  it('limites généreuses pour PAID', () => {
    expect(getRateLimitForPlan('PREMIUM', 'verify')).toEqual({ limit: 60, windowMs: 60_000 })
    expect(getRateLimitForPlan('PREMIUM', 'extension')).toEqual({ limit: 120, windowMs: 60_000 })
    expect(getRateLimitForPlan('PREMIUM', 'contacts')).toEqual({ limit: 30, windowMs: 60_000 })
  })
})

describe('rate-limit-plan — checkPlanRateLimit (fallback in-memory)', () => {
  it('DISCOVERY contacts : autorise 5 puis bloque la 6e (anti-Sybil)', async () => {
    const id = 'user-discovery-contacts-A'
    const results = []
    for (let i = 0; i < 5; i++) {
      results.push(await checkPlanRateLimit('contacts', 'DISCOVERY', id))
    }
    expect(results.every((r) => r.ok)).toBe(true)
    // remaining décroît : 4,3,2,1,0
    expect(results[0].remaining).toBe(4)
    expect(results[4].remaining).toBe(0)

    const sixth = await checkPlanRateLimit('contacts', 'DISCOVERY', id)
    expect(sixth.ok).toBe(false)
    expect(sixth.remaining).toBe(0)
    expect(sixth.limit).toBe(5)
    expect(sixth.retryAfter).toBeGreaterThanOrEqual(1)
  })

  it('PAID contacts : la 6e requête passe encore (limite 30)', async () => {
    const id = 'user-paid-contacts-A'
    let last
    for (let i = 0; i < 6; i++) {
      last = await checkPlanRateLimit('contacts', 'PREMIUM', id)
    }
    expect(last?.ok).toBe(true)
    expect(last?.limit).toBe(30)
  })

  it('isole les compteurs par action et par identifiant', async () => {
    const a = await checkPlanRateLimit('verify', 'DISCOVERY', 'iso-1')
    const b = await checkPlanRateLimit('extension', 'DISCOVERY', 'iso-1')
    // Deux actions distinctes → deux compteurs neufs, chacun à remaining = limit-1
    expect(a.remaining).toBe(9) // verify DISCOVERY limit 10
    expect(b.remaining).toBe(29) // extension DISCOVERY limit 30
  })
})
