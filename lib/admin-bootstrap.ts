// lib/admin-bootstrap.ts
// Admins BLOCKTRUST™ : plan Enterprise Prisma, TrustScore max, relations Trust Circle mutuelles
// ============================================================

import crypto from 'crypto'
import { prisma } from '@/app/lib/db'
import { isAdmin, getAdminEmailList } from '@/lib/admin-utils'

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
  entityId: string,
  publicId: string | null
): Promise<void> {
  const existing = await prisma.signature
    .findFirst({
      where: { certificateId, purpose: 'badge' },
      select: { id: true },
    })
    .catch(() => null)

  if (existing) return

  const jti = publicId ?? certificateId
  const contextHash = crypto.createHash('sha256').update(`badge:${certificateId}`).digest('hex')

  await prisma.signature
    .create({
      data: {
        jti,
        certificateId,
        entityId,
        contextHash,
        purpose: 'badge',
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      },
    })
    .catch(() => null)
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

    if (existingCert) return

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
      await ensureBadgeSignature(pendingCert.id, pendingCert.entityId, pendingCert.publicId)
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
            validationLevel: 'BRONZE',
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

    await ensureBadgeSignature(certificate.id, entity.id, certificate.publicId)

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

  await prisma.user
    .update({
      where: { id: userId },
      data: {
        kycStatus: 'VERIFIED',
        kycVerifiedAt: new Date(),
      },
    })
    .catch(() => null)

  await ensureAdminCertificate(userId, userName?.trim() || email, email)

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
