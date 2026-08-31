import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetRequest } from './helpers/mock-request'

export const VALID_CERT_ID = 'bt-valid-cert-001'
export const REVOKED_CERT_ID = 'bt-revoked-cert-001'
const VALID_API_KEY = 'bt_live_' + 'a'.repeat(32)

const trustEngineMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    globalScore: 82,
    identityScore: 70,
    networkScore: 60,
    behaviorScore: 55,
    technicalScore: 50,
    signals: [],
    recommendation: 'TRUST' as const,
    contextLabel: 'Identité fiable',
  }),
)

const prismaMock = vi.hoisted(() => ({
  signature: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  certificate: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  verification: {
    create: vi.fn().mockResolvedValue({ id: 'v1' }),
  },
  whiteLabelConfig: {
    findFirst: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/lib/rate-limit-public-failclosed', () => ({
  checkPublicVerifyIpRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  PUBLIC_RATE_LIMIT_503_BODY: {
    error: 'service_unavailable',
    message: 'Service temporairement indisponible',
  },
}))

vi.mock('@/lib/rate-limit-verify', () => ({
  checkRateLimitVerifyAsync: vi.fn().mockResolvedValue({
    ok: true,
    remaining: 29,
    limit: 30,
  }),
}))

vi.mock('@/lib/rate-limit-api', () => ({
  checkRateLimitApiAsync: vi.fn().mockResolvedValue({
    ok: true,
    remaining: 29,
    limit: 30,
  }),
}))

const authMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/lib/auth-server', () => ({
  auth: authMock,
}))

vi.mock('@/app/lib/auth', () => ({
  hashIp: vi.fn().mockReturnValue('ip-hash'),
}))

vi.mock('@/lib/trust-engine', () => ({
  computeTrustEngineScore: trustEngineMock,
}))

vi.mock('@/lib/trust-engine-cache', () => ({
  getTrustEngineResultForApi: trustEngineMock,
  invalidateTrustEngineCacheForCertificate: vi.fn(),
}))

vi.mock('@/lib/trustscore', () => ({
  persistUserTrustScore: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/verify-fraud', () => ({
  createAdminFraudAlert: vi.fn().mockResolvedValue(undefined),
  notifyCertificateOwnerFraudAlertFireAndForget: vi.fn(),
}))

vi.mock('@/lib/webhooks', () => ({
  sendWebhook: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/lib/db', () => ({
  prisma: prismaMock,
}))

import { GET as getPublicCertificate } from '@/app/api/public/certificate/[id]/route'
import { GET as getWhiteLabelVerify } from '@/app/api/public/verify/[id]/route'
import { hashApiKey } from '@/lib/api-key'

function baseEntity() {
  return {
    id: 'ent-1',
    userId: 'user-1',
    entityType: 'INDIVIDUAL' as const,
    legalName: null,
    tradeName: null,
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean@example.com',
    kycStatus: 'VERIFIED' as const,
    certifiedDomains: [] as string[],
    certifiedEmails: [] as string[],
    certifiedPhones: [] as string[],
    walletAddress: null,
    walletNetwork: null,
  }
}

function activeCertificate(publicId: string) {
  return {
    id: `internal-${publicId}`,
    publicId,
    status: 'ACTIVE' as const,
    issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: null,
    txHash: null,
    blockchainStatus: 'ANCHORED' as const,
    polygonTxHash: '0xabc',
    entity: baseEntity(),
  }
}

function revokedCertificate(publicId: string) {
  return {
    ...activeCertificate(publicId),
    status: 'REVOKED' as const,
  }
}

describe('/verify public flow (GET /api/public/certificate/:id)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue(null)
    prismaMock.signature.findUnique.mockResolvedValue(null)
    prismaMock.signature.findFirst.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue({
      certifiedEmails: [],
      certifiedPhones: [],
      certifiedDomains: [],
    })
    prismaMock.certificate.findMany.mockResolvedValue([])
  })

  it('retourne VALID + ancrage mais MASQUE le score pour un visiteur anonyme', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(activeCertificate(VALID_CERT_ID))

    const res = await getPublicCertificate(
      mockGetRequest(`/api/public/certificate/${VALID_CERT_ID}`),
      { params: Promise.resolve({ id: VALID_CERT_ID }) },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.verdict).toBe('VALID')
    expect(data.authenticated).toBe(false)
    // Anonyme : score de confiance masqué (defense-in-depth serveur)
    expect(data.trustEngine).toBeUndefined()
    // Ancrage Polygon : réservé dashboard — pas exposé sur /verify public
    expect(data.polygonAnchored).toBe(false)
    expect(data.polygonExplorerUrl).toBeUndefined()
  })

  it('expose le score complet pour un utilisateur connecté', async () => {
    authMock.mockResolvedValue({ user: { id: 'viewer-1' } })
    prismaMock.certificate.findFirst.mockResolvedValue(activeCertificate(VALID_CERT_ID))

    const res = await getPublicCertificate(
      mockGetRequest(`/api/public/certificate/${VALID_CERT_ID}`),
      { params: Promise.resolve({ id: VALID_CERT_ID }) },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.verdict).toBe('VALID')
    expect(data.authenticated).toBe(true)
    expect(data.trustEngine).toBeDefined()
    expect(data.trustEngine.globalScore).toBeGreaterThan(0)
  })

  it('retourne REVOKED pour un certificat révoqué', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(revokedCertificate(REVOKED_CERT_ID))

    const res = await getPublicCertificate(
      mockGetRequest(`/api/public/certificate/${REVOKED_CERT_ID}`),
      { params: Promise.resolve({ id: REVOKED_CERT_ID }) },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.verdict).toBe('REVOKED')
    expect(data.trustEngine).toBeUndefined()
  })

  it('retourne 404 pour un ID inexistant', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(null)

    const res = await getPublicCertificate(
      mockGetRequest('/api/public/certificate/fake-id'),
      { params: Promise.resolve({ id: 'fake-id' }) },
    )

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.verdict).toBe('FRAUD')
  })

  it('badge Découverte non ancré (NOT_ANCHORED) = VALID, sans prétendre à un ancrage', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue({
      ...activeCertificate(VALID_CERT_ID),
      txHash: null,
      polygonTxHash: null,
      blockchainStatus: 'NOT_ANCHORED' as const,
    })

    const res = await getPublicCertificate(
      mockGetRequest(`/api/public/certificate/${VALID_CERT_ID}`),
      { params: Promise.resolve({ id: VALID_CERT_ID }) },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    // Un badge Découverte légitime ne doit pas être qualifié de frauduleux/invalide.
    expect(data.verdict).toBe('VALID')
    // Honnêteté : pas d'ancrage blockchain annoncé pour un badge preview gratuit.
    expect(data.polygonAnchored).toBe(false)
    // Anonyme : score détaillé toujours masqué.
    expect(data.trustEngine).toBeUndefined()
  })

  it('Neon injoignable → 503 ERROR, jamais FRAUD', async () => {
    const err = Object.assign(
      new Error("Can't reach database server at `ep-bold-frost-agajqrnv-pooler.c-2.eu-central-1.aws.neon.tech:5432`"),
      { name: 'PrismaClientInitializationError' },
    )
    prismaMock.signature.findUnique.mockRejectedValue(err)
    prismaMock.signature.findFirst.mockRejectedValue(err)
    prismaMock.certificate.findFirst.mockRejectedValue(err)

    const res = await getPublicCertificate(
      mockGetRequest(`/api/public/certificate/${VALID_CERT_ID}`),
      { params: Promise.resolve({ id: VALID_CERT_ID }) },
    )
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(data.verdict).toBe('ERROR')
    expect(data.error).toBe('service_unavailable')
  })
})

describe('GET /api/public/verify/:id (White Label)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const apiKeyHash = hashApiKey(VALID_API_KEY)
    prismaMock.whiteLabelConfig.findFirst.mockResolvedValue({
      id: 'wl-1',
      apiKey: VALID_API_KEY,
      apiKeyHash,
      canVerify: true,
      apiCallsCount: 0,
      apiCallsLimit: 1000,
      webhookUrl: null,
    })
    prismaMock.verification.create.mockResolvedValue({ id: 'v1' })
  })

  it('retourne VALID pour un certificat actif avec clé API', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue({
      ...activeCertificate(VALID_CERT_ID),
      entity: {
        ...baseEntity(),
        trustScore: { score: 80, level: 'GOLD' },
        user: { kycStatus: 'VERIFIED' },
      },
    })

    const res = await getWhiteLabelVerify(
      mockGetRequest(`/api/public/verify/${VALID_CERT_ID}`, {
        'X-API-Key': VALID_API_KEY,
      }),
      { params: Promise.resolve({ id: VALID_CERT_ID }) },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.verdict).toBe('VALID')
    expect(data.valid).toBe(true)
  })

  it('retourne REVOKED pour un certificat révoqué', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue({
      ...revokedCertificate(REVOKED_CERT_ID),
      entity: {
        ...baseEntity(),
        trustScore: null,
        user: { kycStatus: 'VERIFIED' },
      },
    })

    const res = await getWhiteLabelVerify(
      mockGetRequest(`/api/public/verify/${REVOKED_CERT_ID}`, {
        'X-API-Key': VALID_API_KEY,
      }),
      { params: Promise.resolve({ id: REVOKED_CERT_ID }) },
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.verdict).toBe('REVOKED')
    expect(data.valid).toBe(false)
  })

  it('retourne 404 pour un ID inexistant', async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(null)

    const res = await getWhiteLabelVerify(
      mockGetRequest('/api/public/verify/fake-id', {
        'X-API-Key': VALID_API_KEY,
      }),
      { params: Promise.resolve({ id: 'fake-id' }) },
    )

    expect(res.status).toBe(404)
  })
})
