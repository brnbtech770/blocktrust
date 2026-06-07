// lib/admin-bootstrap.ts
// Admins BLOCKTRUST™ : plan Enterprise Prisma, TrustScore max, relations Trust Circle mutuelles
// ============================================================

import crypto from 'crypto'
import { prisma } from '@/app/lib/db'
import { isAdmin, getAdminEmailList } from '@/lib/admin-utils'
import { syncInternalAccountKycByUserId } from '@/lib/internal-kyc-verified'

async function upsertMutualAdminEdge(fromUserId: string, toUserId: string): Promise<void> {
  await prisma.userTrustRelation
    .upsert({
      where: {
        fromUserId_toUserId: { fromUserId, toUserId },
      },
      create: {
        fromUserId,
        toUserId,
        trustType: 'MUTUAL',
        status: 'CONFIRMED',
        isMutual: true,
        confirmedAt: new Date(),
      },
      update: {
        trustType: 'MUTUAL',
        status: 'CONFIRMED',
        isMutual: true,
        confirmedAt: new Date(),
      },
    })
    .catch(() => null)
}

function splitDisplayName(userName: string): { firstName: string; lastName: string | null } {
  const trimmed = userName.trim()
  if (!trimmed) return { firstName: 'Admin', lastName: null }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

async function ensureBadgeSignature(
  certificateId: string,
  userId: string
): Promise<void> {
  const existing = await prisma.signature
    .findFirst({
      where: {
        certificateId,
        purpose: 'badge',
      },
    })
    .catch(() => null)

  if (existing) return

  const cert = await prisma.certificate
    .findUnique({
      where: { id: certificateId },
      include: { entity: true },
    })
    .catch(() => null)

  if (!cert) return

  const publicId = cert.publicId ?? cert.id
  const contextHash = crypto.createHash('sha256').update(`badge:${certificateId}`).digest('hex')
  let jti: string = crypto.randomUUID()
  let signatureJwt: string | undefined

  try {
    const privateKeyPem = (process.env.BLOCKTRUST_JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
    if (privateKeyPem.includes('BEGIN PRIVATE KEY') || privateKeyPem.includes('BEGIN EC PRIVATE KEY')) {
      const { SignJWT, importPKCS8 } = await import('jose')
      const alg = privateKeyPem.includes('BEGIN RSA PRIVATE KEY') ? 'RS256' : 'ES256'
      const privateKey = await importPKCS8(privateKeyPem, alg)

      signatureJwt = await new SignJWT({
        sub: publicId,
        entityId: cert.entityId,
        userId,
        purpose: 'badge',
      })
        .setProtectedHeader({ alg, typ: 'JWT' })
        .setIssuedAt()
        .setJti(jti)
        .setIssuer('blocktrust')
        .setAudience('blocktrust.verify')
        .setExpirationTime(Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600)
        .sign(privateKey)
    }
  } catch (e) {
    console.error('ensureBadgeSignature JWT skipped:', e)
    jti = publicId
  }

  await prisma.signature
    .create({
      data: {
        jti,
        certificateId,
        entityId: cert.entityId,
        purpose: 'badge',
        contextHash,
        signature: signatureJwt,
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      },
    })
    .catch(() => null)

  console.log(`  Signature badge créée pour cert ${certificateId}`)
}

/**
 * Crée une entité + certificat ACTIVE si l'admin n'en a pas encore (fail-soft).
 */
export async function ensureAdminCertificate(
  userId: string,
  userName: string,
  userEmail: string
): Promise<void> {
  try {
    const existingCert = await prisma.certificate
      .findFirst({
        where: {
          entity: { userId },
          status: { in: ['ACTIVE', 'ANCHORED'] },
        },
        select: { id: true },
      })
      .catch(() => null)

    if (existingCert) {
      await ensureBadgeSignature(existingCert.id, userId).catch(() => null)
      return
    }

    const pendingCert = await prisma.certificate
      .findFirst({
        where: {
          entity: { userId },
          status: 'PENDING',
        },
        select: { id: true, entityId: true, publicId: true },
      })
      .catch(() => null)

    if (pendingCert) {
      await prisma.certificate
        .update({
          where: { id: pendingCert.id },
          data: { status: 'ACTIVE' },
        })
        .catch(() => null)
      await ensureBadgeSignature(pendingCert.id, userId).catch(() => null)
      console.log(`  Certificat activé pour ${userEmail}`)
      return
    }

    let entity = await prisma.entity
      .findFirst({
        where: { userId },
      })
      .catch(() => null)

    if (!entity) {
      const { firstName, lastName } = splitDisplayName(userName)
      entity = await prisma.entity
        .create({
          data: {
            userId,
            entityType: 'INDIVIDUAL',
            firstName,
            lastName,
            email: userEmail,
            certifiedEmails: [userEmail],
            kycStatus: 'VERIFIED',
            validationLevel: 'GOLD',
            emailVerified: true,
          },
        })
        .catch(() => null)
    }

    if (!entity) return

    const certificate = await prisma.certificate
      .create({
        data: {
          entityId: entity.id,
          level: entity.validationLevel,
          status: 'ACTIVE',
          issuedAt: new Date(),
        },
      })
      .catch(() => null)

    if (!certificate) return

    await ensureBadgeSignature(certificate.id, userId).catch(() => null)

    console.log(`  Certificat créé pour ${userEmail}`)
  } catch (e) {
    console.error('ensureAdminCertificate error:', e)
  }
}

/**
 * Met à jour plan Prisma (B2B Enterprise actif) + abonnement code ENTERPRISE + TrustScore 100.
 */
export async function ensureAdminCapabilities(
  userId: string,
  email: string,
  userName?: string | null
): Promise<void> {
  if (!isAdmin(email)) return

  const enterprisePlan = await prisma.plan
    .findFirst({
      where: { type: 'B2B_ENTERPRISE', isActive: true },
      select: { id: true },
    })
    .catch(() => null)

  await prisma.user
    .update({
      where: { id: userId },
      data: {
        ...(enterprisePlan ? { planId: enterprisePlan.id } : {}),
        trustScore: 100,
        trustScoreAt: new Date(),
      },
    })
    .catch(() => null)

  await syncInternalAccountKycByUserId(userId).catch(() => null)

  await ensureAdminCertificate(userId, userName?.trim() || email, email)

  // Re-sync après création éventuelle d'Entity (certificat admin).
  await syncInternalAccountKycByUserId(userId).catch(() => null)

  await prisma.subscription
    .upsert({
      where: { userId },
      create: {
        userId,
        plan: 'ENTERPRISE',
        status: 'active',
      },
      update: {
        plan: 'ENTERPRISE',
        status: 'active',
      },
    })
    .catch(() => null)
}

/**
 * Relie cet admin à tous les autres comptes présents en base pour les emails ADMIN_EMAILS (MUTUAL confirmé).
 */
export async function ensureAdminMutualTrust(userId: string): Promise<void> {
  const adminEmails = getAdminEmailList()
  if (adminEmails.length === 0) return

  const otherAdmins = await prisma.user
    .findMany({
      where: {
        AND: [
          {
            OR: adminEmails.map((e) => ({
              email: { equals: e, mode: 'insensitive' as const },
            })),
          },
          { id: { not: userId } },
        ],
      },
      select: { id: true },
    })
    .catch(() => [] as { id: string }[])

  for (const other of otherAdmins) {
    await upsertMutualAdminEdge(userId, other.id)
    await upsertMutualAdminEdge(other.id, userId)
  }
}

export async function ensureAdminBootstrapForSession(
  userId: string,
  email: string,
  userName?: string | null
): Promise<void> {
  await ensureAdminCapabilities(userId, email, userName)
  if (isAdmin(email)) await ensureAdminMutualTrust(userId)
}

/** POST /api/admin/bootstrap : synchronise tous les emails ADMIN_EMAILS présents en base. */
export async function runAdminBootstrapForAllAdminEmails(): Promise<void> {
  const adminEmails = getAdminEmailList()
  if (adminEmails.length === 0) return

  const users = await prisma.user
    .findMany({
      where: {
        OR: adminEmails.map((e) => ({
          email: { equals: e, mode: 'insensitive' as const },
        })),
      },
      select: { id: true, email: true, name: true },
    })
    .catch(() => [] as { id: string; email: string | null; name: string | null }[])

  for (const u of users) {
    const em = u.email
    if (em && isAdmin(em)) await ensureAdminCapabilities(u.id, em, u.name)
  }

  const ids = users.map((u) => u.id)
  for (const id of ids) {
    await ensureAdminMutualTrust(id)
  }
}
