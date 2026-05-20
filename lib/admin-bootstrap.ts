// lib/admin-bootstrap.ts
// Admins BLOCKTRUST™ : plan Enterprise Prisma, TrustScore max, relations Trust Circle mutuelles
// ============================================================

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

/**
 * Met à jour plan Prisma (B2B Enterprise actif) + abonnement code ENTERPRISE + TrustScore 100.
 */
export async function ensureAdminCapabilities(userId: string, email: string): Promise<void> {
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

export async function ensureAdminBootstrapForSession(userId: string, email: string): Promise<void> {
  await ensureAdminCapabilities(userId, email)
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
      select: { id: true, email: true },
    })
    .catch(() => [] as { id: string; email: string | null }[])

  for (const u of users) {
    const em = u.email
    if (em && isAdmin(em)) await ensureAdminCapabilities(u.id, em)
  }

  const ids = users.map((u) => u.id)
  for (const id of ids) {
    await ensureAdminMutualTrust(id)
  }
}
