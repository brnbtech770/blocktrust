import { describe, it, expect } from 'vitest'
import {
  buildExtensionVerifyResult,
  type ExtensionVerifyContext,
} from '@/lib/extension-verify-sender'
import { isDisposableEmail } from '@/lib/signals/disposable-email'
import type { Certificate, Entity } from '@prisma/client'

type EntityWithCerts = Entity & {
  certificates: Certificate[]
  trustScore: { score: number } | null
}

const BASE_URL = 'https://blocktrust.tech'

function makeCert(status: Certificate['status']): Certificate {
  return {
    id: 'cert-1',
    publicId: 'bt-pub-1',
    entityId: 'entity-1',
    status,
    blockchainStatus: status === 'ANCHORED' ? 'ANCHORED' : 'PENDING',
    polygonTxHash: status === 'ANCHORED' ? '0xabc' : null,
    txHash: null,
    expiresAt: null,
    issuedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: null,
    userId: 'user-1',
    level: null,
    qrEnabled: true,
    qrSettings: null,
  } as unknown as Certificate
}

function makeEntity(
  email: string,
  certStatus: Certificate['status'] = 'ACTIVE',
  trustScore = 87,
): EntityWithCerts {
  return {
    id: 'entity-1',
    userId: 'user-1',
    organizationId: null,
    entityType: 'INDIVIDUAL',
    legalName: null,
    tradeName: null,
    siret: null,
    vatNumber: null,
    firstName: 'Jean',
    lastName: 'Dupont',
    email,
    phone: null,
    website: null,
    address: null,
    city: null,
    postalCode: null,
    country: null,
    kycStatus: 'VERIFIED',
    certifiedEmails: [email],
    certifiedDomains: [],
    certifiedPhones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    certificates: [makeCert(certStatus)],
    trustScore: { score: trustScore },
  } as unknown as EntityWithCerts
}

const emptyCtx: ExtensionVerifyContext = {
  userCertifiedEmails: [],
  userCertifiedDomains: [],
  trustRelationEmails: [],
}

describe('Extension verify-sender', () => {
  it('email certifié → status CERTIFIED', () => {
    const entity = makeEntity('contact@acme.fr')
    const result = buildExtensionVerifyResult(
      [entity],
      'contact@acme.fr',
      'acme.fr',
      BASE_URL,
      emptyCtx,
    )

    expect(result.status).toBe('CERTIFIED')
    expect(result.verified).toBe(true)
    expect(result.trustScore).toBe(87)
    expect(result.badgeUrl).toContain('/badge/')
  })

  it('email dans Trust Circle → IN_CONTACTS', () => {
    const ctx: ExtensionVerifyContext = {
      ...emptyCtx,
      trustRelationEmails: ['partner@corp.io'],
    }
    const result = buildExtensionVerifyResult([], 'partner@corp.io', '', BASE_URL, ctx)

    expect(result.status).toBe('IN_CONTACTS')
    expect(result.signals.inNetwork).toBe(true)
  })

  it('email inconnu → UNKNOWN', () => {
    const result = buildExtensionVerifyResult(
      [],
      'unknown@nowhere.test',
      '',
      BASE_URL,
      emptyCtx,
    )

    expect(result.status).toBe('UNKNOWN')
    expect(result.verified).toBe(false)
    expect(result.trustScore).toBeNull()
  })

  it('email jetable → score réduit (non certifié)', () => {
    const disposable = 'throwaway@mailinator.com'
    expect(isDisposableEmail(disposable)).toBe(true)

    const result = buildExtensionVerifyResult([], disposable, '', BASE_URL, emptyCtx)

    expect(result.status).toBe('UNKNOWN')
    expect(result.trustScore).toBeNull()
    expect(result.verified).toBe(false)
  })

  it('certificat révoqué → FRAUD', () => {
    const entity = makeEntity('fraud@corp.io', 'REVOKED', 40)
    const result = buildExtensionVerifyResult(
      [entity],
      'fraud@corp.io',
      '',
      BASE_URL,
      emptyCtx,
    )

    expect(result.status).toBe('FRAUD')
    expect(result.verified).toBe(false)
  })

  it('email certifié utilisateur sans entité → IN_CONTACTS', () => {
    const ctx: ExtensionVerifyContext = {
      userCertifiedEmails: ['mine@blocktrust.tech'],
      userCertifiedDomains: [],
      trustRelationEmails: [],
    }
    const result = buildExtensionVerifyResult([], 'mine@blocktrust.tech', '', BASE_URL, ctx)

    expect(result.status).toBe('IN_CONTACTS')
  })
})
