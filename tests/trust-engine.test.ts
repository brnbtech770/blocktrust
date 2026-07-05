import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  certificate: {
    findFirst: vi.fn(),
  },
  verification: {
    count: vi.fn(),
  },
  interactionSignature: {
    count: vi.fn(),
  },
  userTrustRelation: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/app/lib/db', () => ({
  prisma: prismaMock,
}))

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

function buildCertFixture(opts: {
  kycStatus: 'VERIFIED' | 'PENDING'
  fraudAlerts?: number
  mutualCount?: number
  accountAgeDays?: number
  subscriptionActive?: boolean
}) {
  const createdAt = new Date(
    Date.now() - (opts.accountAgeDays ?? 200) * 24 * 60 * 60 * 1000,
  )

  return {
    id: 'cert-internal',
    publicId: 'bt-trust-test',
    status: 'ACTIVE' as const,
    blockchainStatus: 'ANCHORED' as const,
    polygonTxHash: '0xdeadbeef',
    entity: {
      certifiedEmails: ['contact@example.com'],
      certifiedDomains: ['example.com'],
      user: {
        id: 'user-trust',
        kycStatus: opts.kycStatus,
        createdAt,
        trustScore: 80,
        certifiedEmails: [],
        certifiedDomains: [],
        subscription: opts.subscriptionActive
          ? { status: 'active' }
          : { status: 'inactive' },
        _count: {
          userTrustFrom: opts.mutualCount ?? 10,
        },
      },
    },
  }
}

describe('Trust Engine scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.userTrustRelation.findFirst.mockResolvedValue(null)
    prismaMock.interactionSignature.count.mockResolvedValue(0)
  })

  it('score KYC vérifié > score sans KYC', async () => {
    prismaMock.verification.count.mockResolvedValue(0)

    prismaMock.certificate.findFirst.mockResolvedValueOnce(
      buildCertFixture({ kycStatus: 'VERIFIED' }),
    )
    const verified = await computeTrustEngineScore('bt-trust-test')

    prismaMock.certificate.findFirst.mockResolvedValueOnce(
      buildCertFixture({ kycStatus: 'PENDING' }),
    )
    const pending = await computeTrustEngineScore('bt-trust-test')

    expect(verified.globalScore).toBeGreaterThan(pending.globalScore)
  })

  it('score avec FRAUD_ALERT < 50', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue({
      id: 'cert-internal',
      publicId: 'bt-trust-test',
      status: 'ACTIVE' as const,
      blockchainStatus: 'ANCHORED' as const,
      polygonTxHash: '0xdeadbeef',
      entity: {
        certifiedEmails: [],
        certifiedDomains: [],
        user: {
          id: 'user-trust',
          kycStatus: 'PENDING',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          trustScore: 10,
          certifiedEmails: [],
          certifiedDomains: [],
          subscription: { status: 'inactive' },
          _count: { userTrustFrom: 0 },
        },
      },
    })
    prismaMock.verification.count.mockResolvedValue(2)

    const result = await computeTrustEngineScore('bt-trust-test')

    expect(result.globalScore).toBeLessThan(50)
    expect(result.recommendation).toBe('DANGER')
  })

  it('recommandation TRUST si score >= 75', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(
      buildCertFixture({
        kycStatus: 'VERIFIED',
        mutualCount: 50,
        accountAgeDays: 365,
        subscriptionActive: true,
      }),
    )
    prismaMock.verification.count.mockResolvedValue(0)

    const result = await computeTrustEngineScore('bt-trust-test')

    expect(result.globalScore).toBeGreaterThanOrEqual(75)
    expect(result.recommendation).toBe('TRUST')
  })

  it('compte interne actif → 100 + isOfficialAccount (court-circuit)', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue({
      id: 'cert-internal',
      publicId: 'bt-official',
      status: 'ACTIVE' as const,
      blockchainStatus: 'ANCHORED' as const,
      polygonTxHash: '0xabc',
      entity: {
        email: 'brnbtech@gmail.com',
        certifiedEmails: [],
        certifiedDomains: [],
        user: {
          id: 'user-official',
          email: 'brnbtech@gmail.com',
          kycStatus: 'VERIFIED',
          createdAt: new Date(),
          trustScore: 0,
          certifiedEmails: [],
          certifiedDomains: [],
          subscription: { status: 'active' },
          _count: { userTrustFrom: 0 },
        },
      },
    })

    const result = await computeTrustEngineScore('bt-official')

    expect(result.globalScore).toBe(100)
    expect(result.isOfficialAccount).toBe(true)
    expect(prismaMock.verification.count).not.toHaveBeenCalled()
  })

  it('compte interne révoqué → 0 (pas de score officiel)', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue({
      id: 'cert-revoked',
      publicId: 'bt-revoked',
      status: 'REVOKED' as const,
      blockchainStatus: 'ANCHORED' as const,
      polygonTxHash: null,
      entity: {
        email: 'brnbtech@gmail.com',
        certifiedEmails: [],
        certifiedDomains: [],
        user: {
          id: 'user-official',
          email: 'brnbtech@gmail.com',
          kycStatus: 'VERIFIED',
          createdAt: new Date(),
          trustScore: 100,
          certifiedEmails: [],
          certifiedDomains: [],
          subscription: { status: 'active' },
          _count: { userTrustFrom: 0 },
        },
      },
    })

    const result = await computeTrustEngineScore('bt-revoked')

    expect(result.globalScore).toBe(0)
    expect(result.isOfficialAccount).toBe(false)
    expect(result.recommendation).toBe('DANGER')
  })

  it('entité test owned par interne → calcul standard (pas 100)', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue({
      id: 'cert-test',
      publicId: 'bt-test-entity',
      status: 'ACTIVE' as const,
      blockchainStatus: 'PENDING' as const,
      polygonTxHash: null,
      entity: {
        email: '1rst.invest@gmail.com',
        certifiedEmails: [],
        certifiedDomains: [],
        user: {
          id: 'user-internal-owner',
          email: 'brnbimmo@gmail.com',
          kycStatus: 'VERIFIED',
          createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
          trustScore: 100,
          certifiedEmails: [],
          certifiedDomains: [],
          subscription: { status: 'active' },
          _count: { userTrustFrom: 5 },
        },
      },
    })
    prismaMock.verification.count.mockResolvedValue(0)

    const result = await computeTrustEngineScore('bt-test-entity')

    expect(result.isOfficialAccount).not.toBe(true)
    expect(result.globalScore).not.toBe(100)
    expect(prismaMock.verification.count).toHaveBeenCalled()
  })
})
