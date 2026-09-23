import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  certificate: { findMany: vi.fn(), findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
}))

vi.mock('@/app/lib/db', () => ({ prisma: prismaMock }))

import { resolveSenderBisCertificate } from '@/lib/bis-sign'

const past = new Date('2020-01-01T00:00:00.000Z')

function row(partial: {
  id: string
  email: string
  status?: string
  revokedAt?: Date | null
  expiresAt?: Date | null
}) {
  return {
    id: partial.id,
    status: partial.status ?? 'ACTIVE',
    revokedAt: partial.revokedAt ?? null,
    expiresAt: partial.expiresAt ?? null,
    polygonTxHash: null,
    polygonExplorerUrl: null,
    entity: { email: partial.email },
  }
}

describe('resolveSenderBisCertificate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retient l’email du badge valide, pas un certificat expiré plus récent', async () => {
    prismaMock.certificate.findMany.mockResolvedValue([
      row({ id: 'expired', email: 'nouveau@exemple.fr', expiresAt: past }),
      row({ id: 'valid', email: 'olivier@brnb.fr' }),
    ])

    const cert = await resolveSenderBisCertificate('user-olivier')

    expect(cert?.id).toBe('valid')
    expect(cert?.entityEmail).toBe('olivier@brnb.fr')
    expect(prismaMock.certificate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entity: { userId: 'user-olivier' },
        }),
      }),
    )
  })

  it('ignore un certificat révoqué', async () => {
    prismaMock.certificate.findMany.mockResolvedValue([
      row({ id: 'revoked', email: 'olivier@brnb.fr', status: 'REVOKED', revokedAt: past }),
    ])

    expect(await resolveSenderBisCertificate('user-olivier')).toBeNull()
  })
})
