import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockGetRequest } from './helpers/mock-request'

const authMock = vi.hoisted(() => vi.fn())
const checkRateLimitMock = vi.hoisted(() => vi.fn())
const handlersPostMock = vi.hoisted(() => vi.fn())
const verifyTokenMock = vi.hoisted(() => vi.fn())

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  kYCVerification: { findFirst: vi.fn() },
}))

vi.mock('@/app/lib/auth-server', () => ({
  auth: authMock,
  handlers: {
    GET: vi.fn(),
    POST: handlersPostMock,
  },
}))

vi.mock('@/app/lib/db', () => ({ prisma: prismaMock }))

vi.mock('@/lib/rate-limit-verify', () => ({
  checkRateLimit: checkRateLimitMock,
  getAuthRatelimit: () => ({}),
}))

vi.mock('@/lib/v2/jwt', () => ({
  verifyToken: verifyTokenMock,
}))

vi.mock('@/lib/trustscore', () => ({
  persistUserTrustScore: vi.fn(),
}))

vi.mock('@/lib/verify-fraud', () => ({
  createAdminFraudAlert: vi.fn(),
  notifyCertificateOwnerFraudAlertFireAndForget: vi.fn(),
}))

vi.mock('@/app/lib/auth', () => ({
  hashIp: vi.fn().mockReturnValue('ip-hash'),
}))

vi.mock('@/lib/prodLog', () => ({ btLog: vi.fn() }))

import { POST as authPost } from '@/app/api/auth/[...nextauth]/route'
import { GET as getKycStatus } from '@/app/api/kyc/status/route'
import { POST as postV2Verify } from '@/app/api/v2/verify/route'

describe('Auth — magic link rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    handlersPostMock.mockResolvedValue(new Response('ok', { status: 200 }))
  })

  it('magic link > 3/heure → 429', async () => {
    checkRateLimitMock.mockResolvedValue({ limited: true })

    const req = new NextRequest('http://localhost/api/auth/signin/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.10',
      },
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    const res = await authPost(req)

    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toBe('Trop de tentatives')
    expect(handlersPostMock).not.toHaveBeenCalled()
  })
})

describe('Auth — session & JWT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('JWT expiré → rejet (401 session ou erreur verify)', async () => {
    authMock.mockResolvedValue(null)

    const sessionRes = await getKycStatus(mockGetRequest('/api/kyc/status'))
    expect(sessionRes.status).toBe(401)

    verifyTokenMock.mockRejectedValue(new Error('JWTExpired: token expired'))
    const jwtRes = await postV2Verify(
      new NextRequest('http://localhost/api/v2/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: 'expired.jwt',
          context: {
            from: 'a@example.com',
            to: 'b@example.com',
            subject: 'Test',
            date: new Date().toISOString(),
          },
        }),
      }),
    )
    expect(jwtRes.status).toBeGreaterThanOrEqual(400)
  })

  it('session valide → 200', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', email: 'user@example.com' } })
    prismaMock.user.findUnique.mockResolvedValue({
      kycStatus: 'VERIFIED',
      kycVerifiedAt: new Date(),
      kycRejectedAt: null,
      kycRejectedReason: null,
      stripeIdentityId: null,
      accountType: 'PERSONAL',
    })

    const res = await getKycStatus(mockGetRequest('/api/kyc/status'))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.kycStatus).toBe('VERIFIED')
  })
})
