import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  BIS_MISSING_ALERT_MESSAGE,
  enrichExtensionPayloadWithBis,
} from '@/lib/extension-bis-enrichment'
import {
  buildExtensionVerifyResult,
  type ExtensionVerifyPayload,
} from '@/lib/extension-verify-sender'

vi.mock('@/lib/bis-public-verify', () => ({
  getPublicBisVerification: vi.fn(),
}))

vi.mock('@/app/lib/db', () => ({
  prisma: {
    interactionSignature: {
      count: vi.fn(),
    },
  },
}))

import { getPublicBisVerification } from '@/lib/bis-public-verify'
import { prisma } from '@/app/lib/db'

const BASE_URL = 'https://blocktrust.tech'

function certifiedPayload(): ExtensionVerifyPayload {
  return buildExtensionVerifyResult(
    [],
    'signer@acme.fr',
    'acme.fr',
    BASE_URL,
    { userCertifiedEmails: [], userCertifiedDomains: [], trustRelationEmails: [] },
  )
}

describe('Extension BIS enrichment', () => {
  beforeEach(() => {
    vi.mocked(getPublicBisVerification).mockReset()
    vi.mocked(prisma.interactionSignature.count).mockReset()
  })

  it('enrichit avec bisVerification quand bisId valide', async () => {
    vi.mocked(getPublicBisVerification).mockResolvedValue({
      valid: true,
      bisLevel: 3,
      interactionType: 'EMAIL',
      contextLabel: 'Devis Q2',
      signedAt: '2026-06-01T10:00:00.000Z',
      expiresAt: '2026-06-08T10:00:00.000Z',
    })
    vi.mocked(prisma.interactionSignature.count).mockResolvedValue(2)

    const base = {
      ...certifiedPayload(),
      status: 'CERTIFIED' as const,
      verified: true,
    }

    const result = await enrichExtensionPayloadWithBis({
      payload: base,
      bisId: 'sig123',
      recipientEmail: 'me@corp.io',
      senderEmail: 'signer@acme.fr',
    })

    expect(result.bisSignatureDetected).toBe(true)
    expect(result.bisVerification?.valid).toBe(true)
    expect(result.bisVerification?.bisLevel).toBe(3)
    expect(result.senderUsuallySignsBis).toBe(true)
    expect(result.bisMissingAlert).toBe(false)
  })

  it('bisMissingAlert si certifié sans lien BIS mais signe habituellement', async () => {
    vi.mocked(prisma.interactionSignature.count).mockResolvedValue(1)

    const base = {
      ...certifiedPayload(),
      status: 'CERTIFIED' as const,
      verified: true,
    }

    const result = await enrichExtensionPayloadWithBis({
      payload: base,
      bisId: null,
      recipientEmail: 'me@corp.io',
      senderEmail: 'signer@acme.fr',
    })

    expect(result.bisSignatureDetected).toBe(false)
    expect(result.bisVerification).toBeNull()
    expect(result.senderUsuallySignsBis).toBe(true)
    expect(result.bisMissingAlert).toBe(true)
    expect(result.bisMissingAlertMessage).toBe(BIS_MISSING_ALERT_MESSAGE)
  })

  it('bisVerification invalide si signature expirée', async () => {
    vi.mocked(getPublicBisVerification).mockResolvedValue({
      valid: false,
      bisLevel: 0,
      interactionType: 'EMAIL',
      contextLabel: null,
      signedAt: '2026-05-01T10:00:00.000Z',
      expiresAt: '2026-05-08T10:00:00.000Z',
      reason: 'Signature expirée',
    })
    vi.mocked(prisma.interactionSignature.count).mockResolvedValue(0)

    const base = {
      ...certifiedPayload(),
      status: 'CERTIFIED' as const,
      verified: true,
    }

    const result = await enrichExtensionPayloadWithBis({
      payload: base,
      bisId: 'expired1',
      recipientEmail: 'me@corp.io',
      senderEmail: 'signer@acme.fr',
    })

    expect(result.bisVerification?.valid).toBe(false)
    expect(result.bisVerification?.reason).toBe('Signature expirée')
    expect(result.bisMissingAlert).toBe(false)
  })
})
