import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  certificate: {
    findFirst: vi.fn(),
  },
  verification: {
    count: vi.fn(),
  },
  userTrustRelation: {
    findFirst: vi.fn(),
  },
}))

vi.mock('@/app/lib/db', () => ({
  prisma: prismaMock,
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
})
