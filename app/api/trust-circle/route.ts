// app/api/trust-circle/route.ts
// Liste les relations User-centric + stats quota
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { checkTrustCircleQuota } from '@/lib/checkTrustCircleQuota'
import { syncMutualRelationsForUser } from '@/lib/trust-circle-mutual'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id
  const plan = (session.user as { plan?: string }).plan ?? 'ESSENTIEL'

  // Trust Circle accessible à tous les utilisateurs vérifiés.
  // Les quotas (checkTrustCircleQuota) limitent selon le plan.
  // Pas de blocage 403 — le quota gère les limites.

  await syncMutualRelationsForUser(userId)

  const [mutual, unilateral, pending, received, manualEntries, quota] = await Promise.all([
    prisma.userTrustRelation.findMany({
      where: { fromUserId: userId, isMutual: true },
      include: {
        toUser: {
          select: { id: true, name: true, email: true, kycStatus: true },
        },
      },
    }),
    prisma.userTrustRelation.findMany({
      where: {
        fromUserId: userId,
        isMutual: false,
        status: 'CONFIRMED',
      },
      include: {
        toUser: {
          select: { id: true, name: true, email: true, kycStatus: true },
        },
      },
    }),
    prisma.userTrustRelation.findMany({
      where: { fromUserId: userId, status: 'PENDING', isMutual: false },
      include: {
        toUser: {
          select: { id: true, name: true, email: true, kycStatus: true },
        },
      },
    }),
    prisma.userTrustRelation.findMany({
      where: { toUserId: userId, status: 'PENDING', isMutual: false },
      select: {
        id: true,
        inviteToken: true,
        fromUser: {
          select: { id: true, name: true, email: true, kycStatus: true },
        },
      },
    }),
    prisma.userManualTrustEntry.findMany({
      where: { requestedBy: userId },
      orderBy: { createdAt: 'desc' },
    }),
    checkTrustCircleQuota(userId, plan),
  ])

  return NextResponse.json({
    mutual,
    unilateral,
    pending,
    received,
    manualEntries,
    stats: {
      current:           quota.current,
      limit:             quota.limit,
      percentage:        quota.percentage,
      shouldShowUpgrade: quota.shouldShowUpgrade,
      upgradeMessage:    quota.upgradeMessage,
    },
  })
}
