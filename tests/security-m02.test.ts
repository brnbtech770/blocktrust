import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  certificateDisplayedVerdict,
  isCertificateCurrentlyValid,
} from '@/lib/certificate-validity'
import {
  extensionVerifyCacheKey,
  invalidateExtensionVerifyCacheForEmail,
} from '@/lib/extension-verify-cache'
import { canonicalizeEmailContext, sha256Hex } from '@/lib/v2/context'

const prismaMock = vi.hoisted(() => ({
  entity: { findMany: vi.fn() },
  user: { findUnique: vi.fn() },
  userTrustRelation: { findMany: vi.fn() },
  signature: { findUnique: vi.fn() },
  verification: { create: vi.fn() },
  certificate: { findUnique: vi.fn() },
  interactionSignature: { count: vi.fn() },
}))

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  incr: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))

const verifyTokenMock = vi.hoisted(() => vi.fn())
const authMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/rate-limit-redis', () => ({ getRedis: () => redisMock }))
vi.mock('@/lib/v2/jwt', () => ({ verifyToken: verifyTokenMock }))
vi.mock('@/app/lib/auth-server', () => ({ auth: authMock }))
vi.mock('@/app/lib/auth', () => ({ hashIp: () => 'ip-hash' }))
vi.mock('@/lib/trustscore', () => ({ persistUserTrustScore: vi.fn() }))
vi.mock('@/lib/verify-fraud', () => ({
  createAdminFraudAlert: vi.fn(),
  notifyCertificateOwnerFraudAlertFireAndForget: vi.fn(),
}))
vi.mock('@/lib/prodLog', () => ({ btLog: vi.fn() }))
vi.mock('@/lib/rate-limit-public-failclosed', () => ({
  checkPublicVerifyIpRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  PUBLIC_RATE_LIMIT_503_BODY: { error: 'service_unavailable' },
}))
vi.mock('@/lib/rate-limit-cost', () => ({
  checkV2VerifyJti: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('@/lib/signals/domain-age', () => ({
  getDomainAge: vi.fn().mockResolvedValue({ agedays: 800, suspicious: false }),
}))
vi.mock('@/lib/signals/disposable-email', () => ({
  isDisposableEmail: vi.fn().mockReturnValue(false),
  getEmailDomain: (email: string) => email.split('@')[1]?.toLowerCase() ?? '',
}))
vi.mock('@/lib/mcp/helpers/domain-dns', () => ({
  checkEmailAuthRecords: vi.fn().mockResolvedValue({ spf: true, dkim: true, dmarc: true }),
  formatDomainAge: (days: number) => `${days}j`,
}))

import { handleVerifyDomain } from '@/lib/mcp/tools/verify-domain'
import { handleVerifyWebsite } from '@/lib/mcp/tools/verify-website'
import { handleCheckDomainReputation } from '@/lib/mcp/tools/check-domain-reputation'
import { runExtensionVerifySender } from '@/lib/extension-verify-sender-service'
import { POST as postV2Verify } from '@/app/api/v2/verify/route'

const now = new Date('2026-09-23T12:00:00.000Z')
const future = new Date('2027-01-01T00:00:00.000Z')
const past = new Date('2020-01-01T00:00:00.000Z')

function mcpText(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text) as Record<string, unknown>
}

const declaredEntity = {
  email: 'ceo@attacker.test',
  website: 'https://banque.fr',
  certifiedDomains: ['banque.fr'],
  entityType: 'BUSINESS',
  tradeName: 'Attaque',
  firstName: null,
  lastName: null,
  legalName: null,
  trustScore: { score: 40 },
  certificates: [
    {
      status: 'ACTIVE',
      revokedAt: null,
      expiresAt: null,
      blockchainStatus: 'ANCHORED',
      polygonTxHash: null,
    },
  ],
}

describe('M02 — validité certificat', () => {
  it('A. ACTIVE non expiré → valide', () => {
    expect(
      isCertificateCurrentlyValid({ status: 'ACTIVE', revokedAt: null, expiresAt: future }, now),
    ).toBe(true)
  })

  it('B. ANCHORED non expiré → valide', () => {
    expect(
      isCertificateCurrentlyValid({ status: 'ANCHORED', revokedAt: null, expiresAt: null }, now),
    ).toBe(true)
  })

  it('C. REVOKED → invalide', () => {
    expect(isCertificateCurrentlyValid({ status: 'REVOKED', revokedAt: null, expiresAt: null }, now)).toBe(
      false,
    )
  })

  it('D. revokedAt != null → invalide', () => {
    expect(
      isCertificateCurrentlyValid({ status: 'ACTIVE', revokedAt: past, expiresAt: null }, now),
    ).toBe(false)
  })

  it('E. EXPIRED → invalide', () => {
    expect(isCertificateCurrentlyValid({ status: 'EXPIRED', revokedAt: null, expiresAt: null }, now)).toBe(
      false,
    )
  })

  it('F. ACTIVE + expiresAt passé → invalide', () => {
    expect(
      isCertificateCurrentlyValid({ status: 'ACTIVE', revokedAt: null, expiresAt: past }, now),
    ).toBe(false)
  })
})

describe('M02 — domaines déclarés', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.entity.findMany.mockImplementation(async (args: {
      where?: { email?: { endsWith?: string } }
      select?: { certificates?: unknown }
      include?: unknown
    }) => {
      const where = JSON.stringify(args?.where ?? {})
      if (where.includes('certifiedDomains') || where.includes('"website"')) {
        throw new Error('champ déclaré utilisé comme preuve de domaine')
      }
      if (args?.select?.certificates && !args.include) {
        return [
          {
            email: 'ceo@attacker.test',
            certificates: declaredEntity.certificates,
          },
        ]
      }
      const suffix = args?.where?.email?.endsWith?.toLowerCase()
      if (suffix && declaredEntity.email.toLowerCase().endsWith(suffix)) {
        return [declaredEntity]
      }
      return []
    })
  })

  it('I/J/K. website ou certifiedDomains tiers → verify_domain jamais certified', async () => {
    const result = mcpText(
      await handleVerifyDomain({ userId: 'u', userEmail: 'a@b.c' } as never, { domain: 'banque.fr' }),
    )
    expect(result.certified).toBe(false)
    expect(result.websiteCertified).toBe(false)
    expect(result.emailDomainSignal).toBe(false)
  })

  it('K. verify_domain : email certifié = signal, pas une certification de domaine', async () => {
    const result = mcpText(
      await handleVerifyDomain({ userId: 'u', userEmail: 'a@b.c' } as never, {
        domain: 'attacker.test',
      }),
    )
    expect(result.certified).toBe(false)
    expect(result.websiteCertified).toBe(false)
    expect(result.emailDomainSignal).toBe(true)
  })

  it('L. verify_website : site déclaré tiers jamais legitimate ni risque LOW', async () => {
    const result = mcpText(
      await handleVerifyWebsite({ userId: 'u', userEmail: 'a@b.c' } as never, {
        url: 'https://banque.fr',
      }),
    )
    expect(result.certified).toBe(false)
    expect(result.legitimate).toBe(false)
    expect(result.phishingRisk).not.toBe('LOW')
  })

  it('M. check_domain_reputation : domaine déclaré jamais certified', async () => {
    const result = mcpText(
      await handleCheckDomainReputation({ userId: 'u', userEmail: 'a@b.c' } as never, {
        domain: 'banque.fr',
      }),
    )
    expect(result.certified).toBe(false)
    expect(result.emailDomainSignal).toBe(false)
  })
})

describe('M02 — cache extension et v2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redisMock.incr.mockResolvedValue(1)
    authMock.mockResolvedValue(null)
    prismaMock.verification.create.mockResolvedValue({ id: 'v' })
  })

  it('P. révocation change la clé de cache serveur', async () => {
    const before = extensionVerifyCacheKey({
      userId: 'viewer',
      emailNorm: 'ceo@attacker.test',
      domainNorm: 'attacker.test',
      bisId: '-',
      generation: 0,
    })
    await invalidateExtensionVerifyCacheForEmail('CEO@attacker.test')
    expect(redisMock.incr).toHaveBeenCalledWith('bt:ext:verify:gen:v8:ceo@attacker.test')
    const after = extensionVerifyCacheKey({
      userId: 'viewer',
      emailNorm: 'ceo@attacker.test',
      domainNorm: 'attacker.test',
      bisId: '-',
      generation: 1,
    })
    expect(after).not.toBe(before)
    expect(after.startsWith('bt:ext:verify:v8:')).toBe(true)
  })

  it('Q. /api/v2/verify ne valide pas un certificat révoqué si Signature.revoked est faux', async () => {
    const context = {
      from: 'a@example.com',
      to: 'b@example.com',
      subject: 'Test',
      date: '2026-09-23T12:00:00.000Z',
    }
    const hash = sha256Hex(canonicalizeEmailContext(context))
    verifyTokenMock.mockResolvedValue({
      jti: 'jti-1',
      entityId: 'ent',
      certificateId: 'cert',
      ctx_hash: hash,
    })
    prismaMock.signature.findUnique.mockResolvedValue({
      jti: 'jti-1',
      revoked: false,
      expiresAt: future,
      contextHash: hash,
      certificateId: 'cert',
      certificate: {
        id: 'cert',
        status: 'REVOKED',
        revokedAt: past,
        expiresAt: null,
        blockchainStatus: 'ANCHORED',
      },
    })

    const res = await postV2Verify(
      new NextRequest('http://localhost/api/v2/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'header.payload.sig', context }),
      }),
    )
    const data = await res.json()
    expect(data.verdict).toBe('REVOKED')
    expect(data.verdict).not.toBe('VALID')
  })

  it('G/H. verify-sender : officiel révoqué ou expiré → pas CERTIFIED', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.userTrustRelation.findMany.mockResolvedValue([
      { toEmail: 'brnbtech@gmail.com', status: 'PENDING', toUserId: null },
    ])
    prismaMock.entity.findMany.mockImplementation(async (args: { where?: { userId?: string } }) => {
      if (args?.where?.userId) return []
      return [
        {
          id: 'ent-off',
          email: 'brnbtech@gmail.com',
          certifiedDomains: [],
          certifiedEmails: [],
          website: null,
          tradeName: null,
          legalName: null,
          firstName: 'Block',
          lastName: 'Trust',
          kycStatus: 'PENDING',
          trustScore: { score: 100 },
          user: { email: 'brnbtech@gmail.com' },
          certificates: [
            {
              id: 'c-off',
              publicId: 'pub-off',
              status: 'REVOKED',
              revokedAt: past,
              expiresAt: null,
              blockchainStatus: 'ANCHORED',
              polygonTxHash: null,
              issuedAt: past,
            },
          ],
        },
      ]
    })

    const revoked = await runExtensionVerifySender({
      userId: 'viewer',
      emailRaw: 'brnbtech@gmail.com',
    })
    expect(revoked.status).not.toBe('CERTIFIED')
    expect(revoked.signals.inNetwork).toBe(false)

    prismaMock.entity.findMany.mockImplementation(async (args: { where?: { userId?: string } }) => {
      if (args?.where?.userId) return []
      return [
        {
          id: 'ent-off',
          email: 'brnbtech@gmail.com',
          certifiedDomains: [],
          certifiedEmails: [],
          website: null,
          tradeName: null,
          legalName: null,
          firstName: 'Block',
          lastName: 'Trust',
          kycStatus: 'PENDING',
          trustScore: { score: 100 },
          user: { email: 'brnbtech@gmail.com' },
          certificates: [
            {
              id: 'c-off',
              publicId: 'pub-off',
              status: 'ACTIVE',
              revokedAt: null,
              expiresAt: past,
              blockchainStatus: 'ANCHORED',
              polygonTxHash: null,
              issuedAt: past,
            },
          ],
        },
      ]
    })

    const expired = await runExtensionVerifySender({
      userId: 'viewer',
      emailRaw: 'brnbtech@gmail.com',
    })
    expect(expired.status).not.toBe('CERTIFIED')
  })
})

describe('M02 — verdict affiché', () => {
  it('révoqué prime sur NOT_ANCHORED', () => {
    expect(
      certificateDisplayedVerdict({
        status: 'ACTIVE',
        revokedAt: past,
        expiresAt: null,
        blockchainStatus: 'NOT_ANCHORED',
      }),
    ).toBe('REVOKED')
  })
})
