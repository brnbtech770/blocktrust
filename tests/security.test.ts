import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetRequest, mockPostRequest } from './helpers/mock-request'

const prismaMock = vi.hoisted(() => ({
  certificate: {
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
}))

const authMock = vi.hoisted(() => vi.fn())
const getAuthUserMock = vi.hoisted(() => vi.fn())
const verifyTokenMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/lib/db', () => ({
  prisma: prismaMock,
}))

vi.mock('@/app/lib/auth-server', () => ({
  auth: authMock,
}))

vi.mock('@/app/lib/auth', () => ({
  getAuthUser: getAuthUserMock,
  hashIp: vi.fn().mockReturnValue('ip-hash'),
}))

vi.mock('@/lib/admin', () => ({
  isAdmin: (email: string | null | undefined) => email === 'brnbtech@gmail.com',
}))

vi.mock('@/lib/v2/jwt', () => ({
  verifyToken: verifyTokenMock,
}))

vi.mock('@/lib/trustscore', () => ({
  persistUserTrustScore: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/verify-fraud', () => ({
  createAdminFraudAlert: vi.fn(),
  notifyCertificateOwnerFraudAlertFireAndForget: vi.fn(),
}))

vi.mock('@/lib/prodLog', () => ({
  btLog: vi.fn(),
}))

import { PATCH } from '@/app/api/certificates/[id]/route'
import { GET as getAdminStats } from '@/app/api/admin/stats/route'
import { POST as postV2Verify } from '@/app/api/v2/verify/route'

describe('IDOR protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ne peut pas voir les certificats d'un autre user", async () => {
    getAuthUserMock.mockResolvedValue({ id: 'user-attacker' })
    prismaMock.certificate.findFirst.mockResolvedValue(null)

    const res = await PATCH(
      mockPostRequest('/api/certificates/cert-other', JSON.stringify({ action: 'revoke' })),
      { params: Promise.resolve({ id: 'cert-other' }) },
    )

    expect(res.status).toBe(404)
    expect(prismaMock.certificate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'cert-other',
          entity: { userId: 'user-attacker' },
        }),
      }),
    )
  })

  it('ne peut pas accéder à /admin sans isAdmin', async () => {
    authMock.mockResolvedValue({
      user: { email: 'user@example.com', id: 'user-1' },
    })

    const res = await getAdminStats(mockGetRequest('/api/admin/stats'))

    expect(res.status).toBe(403)
    expect(prismaMock.certificate.count).not.toHaveBeenCalled()
  })

  it('autorise /admin/stats pour un admin', async () => {
    authMock.mockResolvedValue({
      user: { email: 'brnbtech@gmail.com', id: 'admin-1' },
    })
    prismaMock.certificate.count.mockResolvedValue(0)
    prismaMock.user.count.mockResolvedValue(0)

    const res = await getAdminStats(mockGetRequest('/api/admin/stats'))
    expect(res.status).toBe(200)
  })

  it('rejette les JWT expirés', async () => {
    verifyTokenMock.mockRejectedValue(new Error('Failed to verify token: expired'))

    const res = await postV2Verify(
      mockPostRequest(
        '/api/v2/verify',
        JSON.stringify({
          token: 'expired.jwt.token',
          context: {
            from: 'a@example.com',
            to: 'b@example.com',
            subject: 'Test',
            date: new Date().toISOString(),
          },
        }),
      ),
    )

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.verdict).toBe('ERROR')
  })
})
