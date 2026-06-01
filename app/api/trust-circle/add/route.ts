import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { checkTrustCircleQuota } from '@/lib/checkTrustCircleQuota'
import { persistUserTrustScore } from '@/lib/trustscore'
import { checkPlanRateLimit } from '@/lib/rate-limit-plan'
import { z } from 'zod'

const schema = z.object({
  email:      z.string().email(),
  name:       z.string().min(1).max(100),
  entityType: z.enum(['INDIVIDUAL', 'BUSINESS', 'DOMAIN', 'EMAIL']).default('INDIVIDUAL'),
  note:       z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    const first = parsed.error.issues?.[0]
    return NextResponse.json(
      { error: (first?.message ?? parsed.error.message) || 'Données invalides' },
      { status: 400 }
    )
  }

  const { email, name, entityType, note } = parsed.data
  const userId = session.user.id
  const plan = (session.user as { plan?: string }).plan ?? 'ESSENTIEL'

  // Anti-Sybil (plan Découverte) : limite d'ajouts de contacts par tier.
  const rate = await checkPlanRateLimit('contacts', plan, userId)
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Trop d’ajouts de contacts. Réessayez plus tard.' },
      {
        status: 429,
        headers: rate.retryAfter ? { 'Retry-After': String(rate.retryAfter) } : undefined,
      }
    )
  }

  const quota = await checkTrustCircleQuota(userId, plan)
  if (!quota.allowed) {
    return NextResponse.json({
      error:      'QUOTA_EXCEEDED',
      message:    `Limite atteinte pour le plan ${plan}.`,
      current:    quota.current,
      limit:      quota.limit,
      upgradeUrl: '/pricing',
    }, { status: 403 })
  }

  const targetUser = await prisma.user.findFirst({
    where: { email, kycStatus: 'VERIFIED' },
  })

  if (targetUser) {
    const existing = await prisma.userTrustRelation.findFirst({
      where: {
        fromUserId: userId,
        toUserId:   targetUser.id,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Relation déjà existante' },
        { status: 409 }
      )
    }
  }

  const inviteToken = crypto.randomUUID()
  const inviteExpiry = new Date(Date.now() + (targetUser ? 7 : 30) * 24 * 3600 * 1000)

  const relation = await prisma.userTrustRelation.create({
    data: {
      fromUserId:   userId,
      toUserId:     targetUser?.id ?? null,
      toEmail:      email,
      toName:       name,
      toEntityType: entityType,
      trustType:    targetUser ? 'UNILATERAL' : 'UNVERIFIED',
      status:       'PENDING',
      inviteToken,
      inviteExpiry,
      inviteSentAt: new Date(),
    },
  })

  if (targetUser) {
    const reverse = await prisma.userTrustRelation.findFirst({
      where: {
        fromUserId: targetUser.id,
        toUserId:   userId,
      },
    })

    if (reverse?.status === 'CONFIRMED') {
      await prisma.$transaction([
        prisma.userTrustRelation.update({
          where: { id: relation.id },
          data: {
            isMutual:    true,
            trustType:   'MUTUAL',
            status:      'CONFIRMED',
            confirmedAt: new Date(),
          },
        }),
        prisma.userTrustRelation.update({
          where: { id: reverse.id },
          data: {
            isMutual:    true,
            trustType:   'MUTUAL',
            status:      'CONFIRMED',
            confirmedAt: new Date(),
          },
        }),
      ])
      await persistUserTrustScore(userId)
      await persistUserTrustScore(targetUser.id)
      const { sendMutualTrustEmail } = await import('@/lib/trust-circle-email')
      await sendMutualTrustEmail(userId, targetUser.id).catch(console.error)
      return NextResponse.json({
        success:   true,
        trustType: 'MUTUAL',
        message:   'Confiance mutuelle activée !',
      })
    }

    const { sendTrustCircleInviteEmail } = await import('@/lib/trust-circle-email')
    await sendTrustCircleInviteEmail(
      targetUser.id,
      session.user.id,
      session.user.name ?? 'Un utilisateur BlockTrust',
      session.user.email ?? '',
      inviteToken
    ).catch(console.error)
  } else {
    const { sendTrustCircleExternalInviteEmail } = await import('@/lib/trust-circle-email')
    await sendTrustCircleExternalInviteEmail(
      email,
      name,
      session.user.name ?? 'Un utilisateur BlockTrust',
      inviteToken
    ).catch(console.error)
  }

  return NextResponse.json({
    success:   true,
    trustType: targetUser ? 'UNILATERAL' : 'UNVERIFIED',
    message:   'Invitation envoyée.',
  })
}
