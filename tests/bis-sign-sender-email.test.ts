import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const createBisSignature = vi.hoisted(() => vi.fn())
const resolveSenderBisCertificate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/bis-sign', () => ({
  createBisSignature,
  resolveSenderBisCertificate,
  BisSignError: class BisSignError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/app/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        email: 'brnbtech@gmail.com',
        name: 'Olivier',
      }),
    },
  },
}))

vi.mock('@/app/lib/auth-server', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/extension-auth', () => ({
  extractExtensionApiKey: vi.fn().mockReturnValue('bt_ext_test'),
  findUserIdByExtensionApiKey: vi.fn().mockResolvedValue('user-olivier'),
  EXTENSION_UNAUTHORIZED_BODY: { error: 'unauthorized' },
}))

vi.mock('@/lib/api-key', () => ({
  hashApiKey: vi.fn().mockReturnValue('hash'),
}))

vi.mock('@/lib/rate-limit-extension', () => ({
  checkRateLimitExtensionAsync: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/require-email-verified', () => ({
  assertDashboardMutationAllowed: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/api-key-channel-audit', () => ({
  auditApiKeyChannel: vi.fn(),
}))

vi.mock('@/lib/bis-email-notify', () => ({
  notifyBisRecipientFireAndForget: vi.fn(),
  resolveBisSenderDisplayName: vi.fn().mockReturnValue('Olivier'),
}))

vi.mock('@/lib/prodLog', () => ({
  btErrorDevDetails: vi.fn(),
}))

vi.mock('@/lib/checkQuota', () => ({
  getEntityQuotaSnapshot: vi.fn().mockResolvedValue({
    plan: 'PREMIUM',
    current: 1,
    max: 20,
  }),
}))

import { POST as postBisSign } from '@/app/api/bis/sign/route'
import { GET as getExtensionMe } from '@/app/api/extension/me/route'

describe('BIS composeur — email du badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveSenderBisCertificate.mockResolvedValue({
      id: 'cert-badge',
      polygonTxHash: null,
      polygonExplorerUrl: null,
      entityEmail: 'olivier@brnb.fr',
    })
    createBisSignature.mockResolvedValue({
      signatureId: 'sig-1',
      signature: 'jwt',
      verifyUrl: 'https://blocktrust.tech/verify/bis/sig-1',
      bisLevel: 3,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      payload: {
        sender: 'olivier@brnb.fr',
        recipient: 'a@b.fr',
        type: 'EMAIL',
        context: null,
        contentHash: 'a'.repeat(64),
        iat: 1,
        exp: 2,
      },
    })
  })

  it('signe avec l’email du certificat, pas celui du compte Gmail', async () => {
    const res = await postBisSign(
      new NextRequest('https://blocktrust.tech/api/bis/sign', {
        method: 'POST',
        headers: {
          authorization: 'Bearer bt_ext_test',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: 'destinataire@exemple.fr',
          interactionType: 'EMAIL',
          contentHash: 'ab'.repeat(32),
          notifyRecipient: false,
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(createBisSignature).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId: 'user-olivier',
        senderCertId: 'cert-badge',
        senderEmail: 'olivier@brnb.fr',
      }),
    )
    const arg = createBisSignature.mock.calls[0][0] as { senderEmail: string }
    expect(arg.senderEmail).not.toBe('brnbtech@gmail.com')
  })
})

describe('GET /api/extension/me', () => {
  it('expose le badge du compte authentifié', async () => {
    resolveSenderBisCertificate.mockResolvedValue({
      id: 'cert-badge',
      polygonTxHash: null,
      polygonExplorerUrl: null,
      entityEmail: 'olivier@brnb.fr',
    })

    const { prisma } = await import('@/app/lib/db')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: 'Olivier',
      trustScore: 80,
      subscription: { plan: 'PREMIUM' },
    } as never)

    const res = await getExtensionMe(
      new NextRequest('https://blocktrust.tech/api/extension/me', {
        headers: { authorization: 'Bearer bt_ext_test' },
      }),
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.hasBisCertificate).toBe(true)
    expect(data.bisCertificateEmail).toBe('olivier@brnb.fr')
  })
})
