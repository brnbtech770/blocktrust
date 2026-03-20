// app/api/trust-circle/route.ts
// Liste les relations User-centric + stats quota
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { checkTrustCircleQuota } from '@/lib/checkTrustCircleQuota'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id
  const plan = (session.user as { plan?: string }).plan ?? 'ESSENTIEL'

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  })

  // Trust Circle accessible à tous les utilisateurs vérifiés.
  // Les quotas (checkTrustCircleQuota) limitent selon le plan.
  // Pas de blocage 403 — le quota gère les limites.

  const [mutual, unilateral, pending, manualEntries, quota] = await Promise.all([
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
    }),
    prisma.userTrustRelation.findMany({
      where: { fromUserId: userId, status: 'PENDING' },
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
