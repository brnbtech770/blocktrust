import { describe, it, expect } from 'vitest'
import {
  buildExtensionVerifyResult,
  buildOfficialExtensionVerifyPayload,
  isOfficialSenderEmail,
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
  contactEntityEmails: [],
  contactEntityDomains: [],
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
    expect(result.verdict).toBe('CERTIFIED')
    expect(result.trustScore).toBe(87)
    expect(result.anchoredOnChain).toBe(false)
    expect(result.signals.kycVerified).toBe(true)
    expect(result.badgeUrl).toContain('/badge/')
    expect(result.bisSignatureDetected).toBe(false)
    expect(result.bisVerification).toBeNull()
    expect(result.bisMissingAlert).toBe(false)
    expect(result.message).toBe('Certifié BLOCKTRUST™')
    expect(result.signals.inNetwork).toBe(false)
    expect(result.signals.inContact).toBe(false)
  })

  it('certifié globalement + Trust Circle → CERTIFIED avec inNetwork', () => {
    const entity = makeEntity('partner@corp.io')
    const ctx: ExtensionVerifyContext = {
      ...emptyCtx,
      trustRelationEmails: ['partner@corp.io'],
    }
    const result = buildExtensionVerifyResult(
      [entity],
      'partner@corp.io',
      '',
      BASE_URL,
      ctx,
    )

    expect(result.status).toBe('CERTIFIED')
    expect(result.signals.inNetwork).toBe(true)
    expect(result.message).toContain('réseau')
  })

  it('certifié globalement + contact utilisateur → CERTIFIED avec inContact', () => {
    const entity = makeEntity('vendor@acme.fr')
    const ctx: ExtensionVerifyContext = {
      ...emptyCtx,
      contactEntityEmails: ['vendor@acme.fr'],
    }
    const result = buildExtensionVerifyResult(
      [entity],
      'vendor@acme.fr',
      '',
      BASE_URL,
      ctx,
    )

    expect(result.status).toBe('CERTIFIED')
    expect(result.signals.inContact).toBe(true)
    expect(result.message).toContain('contact vérifié')
  })

  it('email dans Trust Circle sans badge global → IN_CONTACTS gris', () => {
    const ctx: ExtensionVerifyContext = {
      ...emptyCtx,
      trustRelationEmails: ['partner@corp.io'],
    }
    const result = buildExtensionVerifyResult([], 'partner@corp.io', '', BASE_URL, ctx)

    expect(result.status).toBe('IN_CONTACTS')
    expect(result.signals.inNetwork).toBe(true)
    expect(result.verified).toBe(false)
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
      contactEntityEmails: [],
      contactEntityDomains: [],
    }
    const result = buildExtensionVerifyResult([], 'mine@blocktrust.tech', '', BASE_URL, ctx)

    expect(result.status).toBe('IN_CONTACTS')
  })

  it('brnbtech@gmail.com → CERTIFIED officiel Root of Trust', () => {
    expect(isOfficialSenderEmail('brnbtech@gmail.com')).toBe(true)

    const result = buildOfficialExtensionVerifyPayload('brnbtech@gmail.com', BASE_URL)

    expect(result.status).toBe('CERTIFIED')
    expect(result.verified).toBe(true)
    expect(result.trustScore).toBe(100)
    expect(result.officialAccount).toBe(true)
    expect(result.message).toBe('Compte officiel BLOCKTRUST™')
    expect(result.signals.official).toBe(true)
  })

  it('email inconnu non officiel → isOfficialSenderEmail false', () => {
    expect(isOfficialSenderEmail('unknown@nowhere.test')).toBe(false)
  })

  it('expéditeur = email compte mais entité sur autre email → CERTIFIED via ownerActiveEntity', () => {
    const ownerEntity = makeEntity('olivier@blocktrust.tech', 'ACTIVE', 92)
    const result = buildExtensionVerifyResult(
      [],
      'brnbtech@gmail.com',
      'gmail.com',
      BASE_URL,
      emptyCtx,
      ownerEntity,
    )

    expect(result.status).toBe('CERTIFIED')
    expect(result.verified).toBe(true)
    expect(result.entityName).toContain('Jean')
  })
})
