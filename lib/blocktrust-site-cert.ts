/**
 * Certificat ambassadeur BLOCKTRUST™ — entité marque du site (BRNB TECH).
 * Idempotent : création entity + cert + ancrage Polygon pour blocktrust.tech.
 */
import { prisma } from '@/app/lib/db'
import { ensureBadgeSignature } from '@/lib/admin-bootstrap'
import { SUPER_ADMIN_EMAIL } from '@/lib/admin-utils'
import {
  anchorToPolygon,
  computeCertificateAnchorHash,
  isPolygonConfigured,
  notifyAnchorSuccess,
} from '@/lib/polygon'
import { planAllowsPolygonAnchoring, resolveEffectivePlan } from '@/lib/plan-features'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'

export const BLOCKTRUST_SITE_ENTITY = {
  legalName: 'BLOCKTRUST™',
  tradeName: 'BRNB TECH',
  email: 'contact@blocktrust.tech',
  domain: 'blocktrust.tech',
  website: 'https://blocktrust.tech',
} as const

export function getBlocktrustSiteCertPublicIdSync(): string | null {
  const fromEnv =
    process.env.BLOCKTRUST_SITE_CERT_ID?.trim() ||
    process.env.NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID?.trim()
  return fromEnv && fromEnv.length > 0 ? fromEnv : null
}

export async function findBlocktrustSiteEntity(ownerUserId: string) {
  return prisma.entity.findFirst({
    where: {
      userId: ownerUserId,
      entityType: 'BUSINESS',
      OR: [
        { email: { equals: BLOCKTRUST_SITE_ENTITY.email, mode: 'insensitive' } },
        { legalName: BLOCKTRUST_SITE_ENTITY.legalName },
        { certifiedDomains: { has: BLOCKTRUST_SITE_ENTITY.domain } },
      ],
    },
  })
}

export async function getBlocktrustSiteCertPublicId(): Promise<string | null> {
  const fromEnv = getBlocktrustSiteCertPublicIdSync()
  if (fromEnv) return fromEnv

  try {
    const owner = await prisma.user.findFirst({
      where: { email: { equals: SUPER_ADMIN_EMAIL, mode: 'insensitive' } },
      select: { id: true },
    })
    if (!owner) return null

    const entity = await findBlocktrustSiteEntity(owner.id)
    if (!entity) return null

    const cert = await prisma.certificate.findFirst({
      where: {
        entityId: entity.id,
        status: { in: ['ACTIVE', 'ANCHORED'] },
      },
      orderBy: { issuedAt: 'desc' },
      select: { id: true, publicId: true },
    })

    if (!cert) return null
    return cert.publicId ?? cert.id
  } catch {
    return null
  }
}

export type EnsureBlocktrustSiteResult = {
  ownerUserId: string
  entityId: string
  certificateId: string
  publicCertId: string
  verifyUrl: string
  createdEntity: boolean
  createdCertificate: boolean
}

/**
 * Crée ou récupère l'entité BLOCKTRUST™ + certificat ACTIVE signé ES256 (idempotent).
 */
export async function ensureBlocktrustSiteEntityAndCertificate(): Promise<EnsureBlocktrustSiteResult> {
  const owner = await prisma.user.findFirst({
    where: { email: { equals: SUPER_ADMIN_EMAIL, mode: 'insensitive' } },
    select: { id: true, email: true, name: true },
  })

  if (!owner?.email) {
    throw new Error(`Super admin introuvable : ${SUPER_ADMIN_EMAIL}`)
  }

  let createdEntity = false
  let entity = await findBlocktrustSiteEntity(owner.id)

  if (!entity) {
    entity = await prisma.entity.create({
      data: {
        userId: owner.id,
        entityType: 'BUSINESS',
        legalName: BLOCKTRUST_SITE_ENTITY.legalName,
        tradeName: BLOCKTRUST_SITE_ENTITY.tradeName,
        email: BLOCKTRUST_SITE_ENTITY.email,
        website: BLOCKTRUST_SITE_ENTITY.website,
        certifiedDomains: [BLOCKTRUST_SITE_ENTITY.domain],
        certifiedEmails: [BLOCKTRUST_SITE_ENTITY.email],
        kycStatus: 'VERIFIED',
        validationLevel: 'ENTERPRISE',
        emailVerified: true,
        domainVerified: true,
        country: 'FR',
      },
    })
    createdEntity = true
  } else {
    entity = await prisma.entity.update({
      where: { id: entity.id },
      data: {
        entityType: 'BUSINESS',
        legalName: BLOCKTRUST_SITE_ENTITY.legalName,
        tradeName: BLOCKTRUST_SITE_ENTITY.tradeName,
        email: BLOCKTRUST_SITE_ENTITY.email,
        website: BLOCKTRUST_SITE_ENTITY.website,
        certifiedDomains: { set: [BLOCKTRUST_SITE_ENTITY.domain] },
        certifiedEmails: { set: [BLOCKTRUST_SITE_ENTITY.email] },
        kycStatus: 'VERIFIED',
        validationLevel: 'ENTERPRISE',
        emailVerified: true,
        domainVerified: true,
      },
    })
  }

  let createdCertificate = false
  let certificate = await prisma.certificate.findFirst({
    where: {
      entityId: entity.id,
      status: { in: ['ACTIVE', 'ANCHORED', 'PENDING'] },
    },
    orderBy: { issuedAt: 'desc' },
  })

  if (certificate?.status === 'PENDING') {
    certificate = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { status: 'ACTIVE', level: 'ENTERPRISE' },
    })
  }

  if (!certificate) {
    certificate = await prisma.certificate.create({
      data: {
        entityId: entity.id,
        level: 'ENTERPRISE',
        status: 'ACTIVE',
        blockchainStatus: 'PENDING',
        issuedAt: new Date(),
      },
    })
    createdCertificate = true
  } else if (certificate.blockchainStatus === 'NOT_ANCHORED') {
    certificate = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { blockchainStatus: 'PENDING', level: 'ENTERPRISE' },
    })
  }

  await ensureBadgeSignature(certificate.id, owner.id)

  const publicCertId = certificate.publicId ?? certificate.id
  const verifyUrl = buildPublicVerifyUrl(publicCertId)

  return {
    ownerUserId: owner.id,
    entityId: entity.id,
    certificateId: certificate.id,
    publicCertId,
    verifyUrl,
    createdEntity,
    createdCertificate,
  }
}

export type AnchorBlocktrustSiteResult = {
  anchored: boolean
  alreadyAnchored: boolean
  txHash: string | null
  explorerUrl: string | null
}

/**
 * Ancre le certificat ambassadeur sur Polygon si le plan le permet (Enterprise).
 * Idempotent — skip si déjà ANCHORED.
 */
export async function anchorBlocktrustSiteCertificate(
  certificateId: string,
): Promise<AnchorBlocktrustSiteResult> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      entity: {
        include: {
          user: {
            select: {
              email: true,
              subscription: { select: { plan: true, status: true } },
            },
          },
        },
      },
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  if (!cert) {
    throw new Error(`Certificat introuvable : ${certificateId}`)
  }

  if (cert.blockchainStatus === 'ANCHORED' && cert.polygonTxHash) {
    return {
      anchored: true,
      alreadyAnchored: true,
      txHash: cert.polygonTxHash,
      explorerUrl: cert.polygonExplorerUrl,
    }
  }

  const effectivePlan = resolveEffectivePlan({
    subscription: cert.entity.user.subscription,
    email: cert.entity.user.email,
  })

  if (!planAllowsPolygonAnchoring(effectivePlan)) {
    throw new Error(
      `Plan ${effectivePlan} — ancrage Polygon non autorisé (attendu Enterprise actif)`,
    )
  }

  if (!isPolygonConfigured()) {
    throw new Error('Polygon non configuré (POLYGON_RPC_URL / POLYGON_PRIVATE_KEY)')
  }

  const hash = computeCertificateAnchorHash(cert)
  const anchor = await anchorToPolygon(certificateId, hash)

  await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      polygonTxHash: anchor.txHash,
      polygonBlock: anchor.blockNumber,
      polygonAnchoredAt: new Date(),
      polygonExplorerUrl: anchor.explorerUrl,
      blockchainStatus: 'ANCHORED',
      status: 'ACTIVE',
    },
  })

  notifyAnchorSuccess(certificateId, anchor).catch(() => null)

  return {
    anchored: true,
    alreadyAnchored: false,
    txHash: anchor.txHash,
    explorerUrl: anchor.explorerUrl,
  }
}
