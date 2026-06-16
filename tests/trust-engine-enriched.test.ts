import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDomainAge } from '@/lib/signals/domain-age'
import { isDisposableEmail } from '@/lib/signals/disposable-email'
import { checkIpReputation } from '@/lib/signals/ip-reputation'

const prismaMock = vi.hoisted(() => ({
  certificate: { findFirst: vi.fn() },
  verification: { count: vi.fn() },
  interactionSignature: { count: vi.fn() },
  userTrustRelation: { findFirst: vi.fn() },
}))

vi.mock('@/app/lib/db', () => ({ prisma: prismaMock }))

vi.mock('@/lib/signals/domain-age', () => ({
  getDomainAge: vi.fn().mockResolvedValue({ agedays: 400, suspicious: false }),
}))

vi.mock('@/lib/signals/disposable-email', () => ({
  isDisposableEmail: vi.fn().mockReturnValue(false),
  getEmailDomain: vi.fn((email: string) => email.split('@')[1]?.toLowerCase() ?? ''),
}))

vi.mock('@/lib/signals/ip-reputation', () => ({
  checkIpReputation: vi.fn().mockResolvedValue({ score: 0, abusive: false, isp: '' }),
}))

import { computeTrustEngineScore } from '@/lib/trust-engine'

function baseCert(overrides: {
  certifiedEmails?: string[]
  mutualCount?: number
  kycStatus?: 'VERIFIED' | 'PENDING'
  subscriptionActive?: boolean
  accountAgeDays?: number
}) {
  const createdAt = new Date(
    Date.now() - (overrides.accountAgeDays ?? 400) * 24 * 60 * 60 * 1000,
  )
  return {
    id: 'cert-internal',
    publicId: 'bt-enriched',
    status: 'ACTIVE' as const,
    blockchainStatus: 'ANCHORED' as const,
    polygonTxHash: '0xdeadbeef',
    entity: {
      email: 'owner@example.com',
      certifiedEmails: overrides.certifiedEmails ?? ['owner@example.com'],
      certifiedDomains: ['example.com'],
      user: {
        id: 'user-owner',
        email: 'owner@example.com',
        kycStatus: overrides.kycStatus ?? 'VERIFIED',
        createdAt,
        trustScore: 60,
        certifiedEmails: [],
        certifiedDomains: [],
        subscription: overrides.subscriptionActive
          ? { status: 'active' }
          : { status: 'inactive' },
        _count: { userTrustFrom: overrides.mutualCount ?? 5 },
      },
    },
  }
}

describe('Trust Engine — signaux enrichis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.verification.count.mockResolvedValue(0)
    prismaMock.interactionSignature.count.mockResolvedValue(0)
    vi.mocked(getDomainAge).mockResolvedValue({ agedays: 400, suspicious: false })
    vi.mocked(isDisposableEmail).mockReturnValue(false)
    vi.mocked(checkIpReputation).mockResolvedValue({ score: 0, abusive: false, isp: '' })
    prismaMock.userTrustRelation.findFirst.mockResolvedValue(null)
  })

  it('domain age suspect → TechnicalScore réduit', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(
      baseCert({ subscriptionActive: false, kycStatus: 'PENDING', mutualCount: 0 }),
    )

    vi.mocked(getDomainAge)
      .mockResolvedValueOnce({ agedays: 400, suspicious: false })
      .mockResolvedValueOnce({ agedays: 12, suspicious: true })

    const baseline = await computeTrustEngineScore('bt-enriched')
    const withSuspectDomain = await computeTrustEngineScore('bt-enriched')

    expect(withSuspectDomain.signals.some((s) => s.type === 'DOMAIN_NEW')).toBe(true)
    expect(withSuspectDomain.technicalScore).toBeLessThan(baseline.technicalScore)
  })

  it('disposable email → TechnicalScore -30', async () => {
    vi.mocked(isDisposableEmail).mockImplementation((email) =>
      email.includes('mailinator.com'),
    )
    prismaMock.certificate.findFirst.mockResolvedValue(
      baseCert({
        certifiedEmails: ['spam@mailinator.com'],
        subscriptionActive: true,
      }),
    )

    const result = await computeTrustEngineScore('bt-enriched')

    expect(result.signals.some((s) => s.type === 'DISPOSABLE_EMAIL')).toBe(true)
    expect(result.technicalScore).toBeLessThanOrEqual(70)
  })

  it('propagation indirecte → NetworkScore +10', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(
      baseCert({ mutualCount: 2, kycStatus: 'VERIFIED' }),
    )
    prismaMock.userTrustRelation.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'indirect-rel' })

    const withoutViewer = await computeTrustEngineScore('bt-enriched')
    prismaMock.userTrustRelation.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'indirect-rel' })
    const withIndirect = await computeTrustEngineScore('bt-enriched', 'viewer-1')

    expect(withIndirect.signals.some((s) => s.type === 'INDIRECT_NETWORK')).toBe(true)
    expect(withIndirect.networkScore).toBe(withoutViewer.networkScore + 10)
  })

  it('score global avec tous les signaux positifs', async () => {
    vi.mocked(getDomainAge).mockResolvedValue({ agedays: 800, suspicious: false })
    prismaMock.certificate.findFirst.mockResolvedValue(
      baseCert({
        kycStatus: 'VERIFIED',
        mutualCount: 50,
        subscriptionActive: true,
        accountAgeDays: 400,
        certifiedEmails: ['trusted@example.com'],
      }),
    )
    prismaMock.userTrustRelation.findFirst.mockResolvedValue({ id: 'direct-rel' })

    const result = await computeTrustEngineScore('bt-enriched', 'viewer-1', {
      contextIp: '8.8.8.8',
    })

    expect(result.globalScore).toBeGreaterThanOrEqual(75)
    expect(result.recommendation).toBe('TRUST')
    expect(result.signals.some((s) => s.type === 'KYC_VERIFIED')).toBe(true)
    expect(
      result.signals.some(
        (s) => s.type === 'DOMAIN_ESTABLISHED' || s.type === 'IN_YOUR_NETWORK',
      ),
    ).toBe(true)
  })
})
