import { describe, it, expect, vi, beforeEach } from 'vitest'

// On mocke rate-limit-redis pour exercer le CHEMIN Redis (distribué) des modules
// rate-limit-plan / rate-limit-cost — l'autre suite couvre déjà le fallback in-memory.
const tryRedisLimitMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rate-limit-redis', () => {
  const limiter = () => ({}) // valeur non-null quelconque (tryRedisLimit est mocké)
  return {
    tryRedisLimit: tryRedisLimitMock,
    // limiteurs consommés par rate-limit-plan
    getVerifyPlanDiscoveryLimiter: limiter,
    getVerifyPlanPaidLimiter: limiter,
    getExtensionPlanDiscoveryLimiter: limiter,
    getExtensionPlanPaidLimiter: limiter,
    getContactsPlanDiscoveryLimiter: limiter,
    getContactsPlanPaidLimiter: limiter,
    // limiteurs consommés par rate-limit-cost
    getKycHourLimiter: limiter,
    getV2VerifyJtiLimiter: limiter,
    getKycSiretLimiter: limiter,
    getForgotPasswordLimiter: limiter,
    getResolveTokenLimiter: limiter,
    getBadgeLimiter: limiter,
  }
})

import { checkPlanRateLimit } from '@/lib/rate-limit-plan'
import { checkKycRateLimit, checkKycSiretRateLimit } from '@/lib/rate-limit-cost'

describe('rate-limit-plan — chemin Redis distribué', () => {
  beforeEach(() => vi.clearAllMocks())

  it('Redis autorise → ok avec remaining/limit issus de Redis', async () => {
    tryRedisLimitMock.mockResolvedValue({
      success: true,
      remaining: 7,
      limit: 60,
      reset: Date.now() + 30_000,
    })

    const r = await checkPlanRateLimit('verify', 'PREMIUM', 'redis-id-1')
    expect(r.ok).toBe(true)
    expect(r.remaining).toBe(7)
    expect(r.limit).toBe(60)
  })

  it('Redis refuse → ok=false + retryAfter calculé depuis reset', async () => {
    tryRedisLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 10,
      reset: Date.now() + 5_000,
    })

    const r = await checkPlanRateLimit('contacts', 'DISCOVERY', 'redis-id-2')
    expect(r.ok).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.limit).toBe(10)
    expect(r.retryAfter).toBeGreaterThanOrEqual(1)
  })
})

describe('rate-limit-cost — chemin Redis distribué', () => {
  beforeEach(() => vi.clearAllMocks())

  it('KYC : Redis autorise → ok', async () => {
    tryRedisLimitMock.mockResolvedValue({
      success: true,
      remaining: 2,
      limit: 3,
      reset: Date.now() + 1000,
    })
    const r = await checkKycRateLimit('redis-kyc-1')
    expect(r.ok).toBe(true)
  })

  it('SIRET : Redis refuse → ok=false + retryAfter', async () => {
    tryRedisLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      limit: 10,
      reset: Date.now() + 8_000,
    })
    const r = await checkKycSiretRateLimit('redis-siret-1')
    expect(r.ok).toBe(false)
    expect(r.retryAfter).toBeGreaterThanOrEqual(1)
  })
})
