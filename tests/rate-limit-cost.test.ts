import { describe, it, expect } from 'vitest'
import {
  checkKycRateLimit,
  checkV2VerifyJti,
  checkKycSiretRateLimit,
  checkForgotPasswordRateLimit,
  checkResolveTokenRateLimit,
  checkBadgeRateLimit,
} from '@/lib/rate-limit-cost'

// Sans UPSTASH_* configuré → fallback in-memory. Identifiants uniques par test.

async function exhaust(
  fn: (id: string) => Promise<{ ok: boolean; retryAfter?: number }>,
  id: string,
  max: number,
) {
  const allowed = []
  for (let i = 0; i < max; i++) allowed.push(await fn(id))
  const blocked = await fn(id)
  return { allowed, blocked }
}

describe('rate-limit-cost — KYC Stripe Identity (3/h par userId)', () => {
  it('autorise 3 puis bloque la 4e avec retryAfter', async () => {
    const { allowed, blocked } = await exhaust(checkKycRateLimit, 'kyc-user-A', 3)
    expect(allowed.every((r) => r.ok)).toBe(true)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThanOrEqual(1)
  })
})

describe('rate-limit-cost — vérification SIRET INSEE (10/h par userId)', () => {
  it('autorise 10 puis bloque la 11e', async () => {
    const { allowed, blocked } = await exhaust(checkKycSiretRateLimit, 'siret-user-A', 10)
    expect(allowed.every((r) => r.ok)).toBe(true)
    expect(blocked.ok).toBe(false)
  })
})

describe('rate-limit-cost — mot de passe oublié (3/h par identifiant)', () => {
  it('autorise 3 puis bloque la 4e', async () => {
    const { allowed, blocked } = await exhaust(
      checkForgotPasswordRateLimit,
      'email:test@example.com',
      3,
    )
    expect(allowed.every((r) => r.ok)).toBe(true)
    expect(blocked.ok).toBe(false)
  })
})

describe('rate-limit-cost — résolution token rotatif (30/min par IP)', () => {
  it('autorise 30 puis bloque la 31e (anti brute-force)', async () => {
    const { allowed, blocked } = await exhaust(checkResolveTokenRateLimit, '203.0.113.7', 30)
    expect(allowed.every((r) => r.ok)).toBe(true)
    expect(blocked.ok).toBe(false)
  })
})

describe('rate-limit-cost — anti-boucle /api/v2/verify par jti (20/min)', () => {
  it('autorise 20 puis bloque la 21e', async () => {
    const { allowed, blocked } = await exhaust(checkV2VerifyJti, 'jti-abc', 20)
    expect(allowed.every((r) => r.ok)).toBe(true)
    expect(blocked.ok).toBe(false)
  })
})

describe('rate-limit-cost — QR/badge (120/min par IP, anti-énumération)', () => {
  it('limite généreuse : passe largement sous le seuil', async () => {
    const first = await checkBadgeRateLimit('198.51.100.4')
    expect(first.ok).toBe(true)
  })

  it('finit par bloquer au-delà de 120', async () => {
    const { blocked } = await exhaust(checkBadgeRateLimit, '198.51.100.5', 120)
    expect(blocked.ok).toBe(false)
  })
})
