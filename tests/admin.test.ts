import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockGetRequest, mockPostRequest } from './helpers/mock-request'

function mockPatchRequest(path: string, body: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

const prismaMock = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  certificate: { count: vi.fn() },
  kYCVerification: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}))

const authMock = vi.hoisted(() => vi.fn())
const redirectMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/app/lib/auth-server', () => ({ auth: authMock }))
vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('@/lib/kyc-email', () => ({
  sendKYCApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendKYCRejectedEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/trustscore', () => ({
  persistUserTrustScore: vi.fn().mockResolvedValue(undefined),
}))

import { requireAdminPage } from '@/app/lib/require-admin-page'
import { GET as getAdminStats } from '@/app/api/admin/stats/route'
import { GET as getAdminUsers, POST as createTestUser } from '@/app/api/admin/users/route'
import { PATCH as approveKyc } from '@/app/api/admin/kyc/[userId]/approve/route'
import { PATCH as rejectKyc } from '@/app/api/admin/kyc/[userId]/reject/route'

const ADMIN_EMAIL = 'admin@blocktrust.tech'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_EMAILS = ADMIN_EMAIL
  redirectMock.mockImplementation((url: string) => {
    const err = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: `NEXT_REDIRECT;replace;${url};303;`,
    })
    throw err
  })
  prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => {
    for (const op of ops) {
      if (typeof op === 'object' && op !== null && 'then' in op) await op
    }
  })
})

describe('Admin — accès', () => {
  it('/admin/dashboard (requireAdminPage) → refus sans isAdmin', async () => {
    authMock.mockResolvedValue({ user: { email: 'user@example.com', id: 'u1' } })

    await expect(requireAdminPage()).rejects.toMatchObject({
      digest: expect.stringContaining('/dashboard'),
    })
  })

  it('/admin/stats API → 403 sans isAdmin', async () => {
    authMock.mockResolvedValue({ user: { email: 'user@example.com', id: 'u1' } })

    const res = await getAdminStats(mockGetRequest('/api/admin/stats'))

    expect(res.status).toBe(403)
  })

  it('requireAdminPage → session admin valide', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })

    const session = await requireAdminPage()

    expect(session.user.email).toBe(ADMIN_EMAIL)
    expect(redirectMock).not.toHaveBeenCalled()
  })
})

describe('Admin — KYC', () => {
  it('approve → success', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })
    prismaMock.user.update.mockResolvedValue({})
    prismaMock.kYCVerification.updateMany.mockResolvedValue({ count: 1 })

    const res = await approveKyc(mockPatchRequest('/api/admin/kyc/u1/approve', '{}'), {
      params: Promise.resolve({ userId: 'u1' }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('reject → success avec raison', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })
    prismaMock.user.update.mockResolvedValue({})

    const res = await rejectKyc(
      mockPatchRequest(
        '/api/admin/kyc/u1/reject',
        JSON.stringify({ reason: 'Document illisible' }),
      ),
      { params: Promise.resolve({ userId: 'u1' }) },
    )

    expect(res.status).toBe(200)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ kycStatus: 'REJECTED' }),
      }),
    )
  })
})

describe('Admin — clients / users', () => {
  it('liste utilisateurs formatée correctement', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'client@example.com',
        name: 'Client Test',
        createdAt: new Date('2026-01-01'),
        plan: { id: 'p1', name: 'Premium', type: 'B2C' },
        entities: [{ _count: { certificates: 2 } }],
      },
    ])

    const res = await getAdminUsers(mockGetRequest('/api/admin/users'))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.users).toHaveLength(1)
    expect(data.users[0]).toMatchObject({
      email: 'client@example.com',
      name: 'Client Test',
      certificatesCount: 2,
      entitiesCount: 1,
    })
  })

  it('liste users → 403 sans admin', async () => {
    authMock.mockResolvedValue({ user: { email: 'user@example.com', id: 'u1' } })

    const res = await getAdminUsers(mockGetRequest('/api/admin/users'))

    expect(res.status).toBe(403)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('liste users → 500 si la DB échoue (catch)', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })
    prismaMock.user.findMany.mockRejectedValue(new Error('db down'))

    const res = await getAdminUsers(mockGetRequest('/api/admin/users'))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toContain('Erreur lors de la récupération')
  })

  it('POST création user de test → 403 sans admin', async () => {
    authMock.mockResolvedValue({ user: { email: 'user@example.com', id: 'u1' } })

    const res = await createTestUser(
      mockPostRequest('/api/admin/users', JSON.stringify({ test: true })),
    )

    expect(res.status).toBe(403)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('POST → 400 si le corps ne contient pas test:true', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })

    const res = await createTestUser(
      mockPostRequest('/api/admin/users', JSON.stringify({ foo: 'bar' })),
    )

    expect(res.status).toBe(400)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('POST test:true → 201 et crée un compte de test', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })
    prismaMock.user.create.mockResolvedValue({
      id: 'test-1',
      email: 'test+abcd@blocktrust.test',
      name: 'Utilisateur test abcd',
    })

    const res = await createTestUser(
      mockPostRequest('/api/admin/users', JSON.stringify({ test: true })),
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.user.id).toBe('test-1')
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1)
  })

  it('POST → 500 si la création DB échoue (catch)', async () => {
    authMock.mockResolvedValue({ user: { email: ADMIN_EMAIL, id: 'admin-1' } })
    prismaMock.user.create.mockRejectedValue(new Error('insert failed'))

    const res = await createTestUser(
      mockPostRequest('/api/admin/users', JSON.stringify({ test: true })),
    )

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('insert failed')
  })
})
