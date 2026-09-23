import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPostRequest } from './helpers/mock-request'

const prismaMock = vi.hoisted(() => ({
  entity: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}))

const authMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/lib/db', () => ({
  prisma: prismaMock,
}))

vi.mock('@/app/lib/auth-server', () => ({
  auth: authMock,
}))

import { PATCH } from '@/app/api/entities/[id]/route'

const entity = {
  id: 'ent-1',
  userId: 'user-1',
  entityType: 'INDIVIDUAL',
  website: 'https://kept.example',
  certifiedDomains: ['kept.example'],
  certifiedEmails: ['kept@example.com'],
  walletAddress: null,
  walletNetwork: null,
}

describe('PATCH entity — champs certifiés en lecture seule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.entity.findFirst.mockResolvedValue(entity)
    prismaMock.entity.update.mockResolvedValue(entity)
  })

  it('rejette certifiedDomains (400) sans écrire en base', async () => {
    const res = await PATCH(
      mockPostRequest(
        '/api/entities/ent-1',
        JSON.stringify({ certifiedDomains: ['gmail.com', 'cible.fr'] }),
      ),
      { params: Promise.resolve({ id: 'ent-1' }) },
    )

    expect(res.status).toBe(400)
    expect(prismaMock.entity.update).not.toHaveBeenCalled()
  })

  it('rejette certifiedEmails et website', async () => {
    const emails = await PATCH(
      mockPostRequest(
        '/api/entities/ent-1',
        JSON.stringify({ certifiedEmails: ['direction@cible.fr'] }),
      ),
      { params: Promise.resolve({ id: 'ent-1' }) },
    )
    const website = await PATCH(
      mockPostRequest(
        '/api/entities/ent-1',
        JSON.stringify({ website: 'https://cible.fr' }),
      ),
      { params: Promise.resolve({ id: 'ent-1' }) },
    )

    expect(emails.status).toBe(400)
    expect(website.status).toBe(400)
    expect(prismaMock.entity.update).not.toHaveBeenCalled()
  })

  it('autorise encore la mise à jour du téléphone', async () => {
    const res = await PATCH(
      mockPostRequest('/api/entities/ent-1', JSON.stringify({ phone: '+33601020304' })),
      { params: Promise.resolve({ id: 'ent-1' }) },
    )

    expect(res.status).toBe(200)
    expect(prismaMock.entity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ent-1' },
        data: { phone: '+33601020304' },
      }),
    )
  })
})
