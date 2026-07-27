// app/api/trust-circle/route.ts
// Liste les relations User-centric + stats quota
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { checkTrustCircleQuota } from '@/lib/checkTrustCircleQuota'
import { syncMutualRelationsForUser } from '@/lib/trust-circle-mutual'
import { linkPendingInvitesToUser, pendingReceivedInviteWhere } from '@/lib/trust-circle-invites'
import { resolveEffectivePlan } from '@/lib/plan-features'
import {
  buildOwnEmailSet,
  filterOwnTrustCircleRelations,
} from '@/lib/trust-circle-own-filter'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      plan: { select: { type: true } },
      subscription: {
        select: {
          plan: true,
          status: true,
          stripeSubscriptionId: true,
          currentPeriodEnd: true,
        },
      },
    },
  })

  const plan = resolveEffectivePlan({
    subscription: user?.subscription,
    email: user?.email ?? session.user.email,
    planType: user?.plan?.type,
  })

  // Trust Circle accessible à tous les utilisateurs vérifiés.
  // Les quotas (checkTrustCircleQuota) limitent selon le plan.
  // Pas de blocage 403 — le quota gère les limites.

  await syncMutualRelationsForUser(userId)

  if (session.user.email) {
    await linkPendingInvitesToUser(userId, session.user.email).catch(() => null)
  }

  const ownEntityEmails = await prisma.entity.findMany({
    where: { userId },
    select: { email: true },
  })
  const ownEmails = buildOwnEmailSet(
    session.user.email,
    ownEntityEmails.map((e) => e.email),
  )

  const [mutualRaw, unilateralRaw, pendingRaw, receivedRaw, manualEntries, quota] = await Promise.all([
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
      where: pendingReceivedInviteWhere(userId, session.user.email),
      select: {
        id: true,
        inviteToken: true,
        toEmail: true,
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

  const mutual = filterOwnTrustCircleRelations(mutualRaw, userId, ownEmails)
  const unilateral = filterOwnTrustCircleRelations(unilateralRaw, userId, ownEmails)
  const pending = filterOwnTrustCircleRelations(pendingRaw, userId, ownEmails)
  const received = receivedRaw.filter((r) => r.fromUser.id !== userId)

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
