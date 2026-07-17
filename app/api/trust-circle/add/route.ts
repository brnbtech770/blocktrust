import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { assertDashboardMutationAllowed } from '@/lib/require-email-verified'
import { addContactToTrustNetwork } from '@/lib/add-contact-trust-network'
import { checkPlanRateLimit } from '@/lib/rate-limit-plan'
import { resolveEffectivePlan, planAllowsTrustCircle } from '@/lib/plan-features'
import { prisma } from '@/app/lib/db'
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
      { status: 400 },
    )
  }

  const { email, name, entityType } = parsed.data
  const userId = session.user.id

  const mutationGuard = await assertDashboardMutationAllowed(userId, session.user.email)
  if (!mutationGuard.ok) {
    return NextResponse.json(
      {
        error: mutationGuard.code,
        message: mutationGuard.message,
        ...(mutationGuard.code === 'DISCOVERY_EXPIRED' ? { upgradeUrl: mutationGuard.upgradeUrl } : {}),
      },
      { status: mutationGuard.status },
    )
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  })
  const plan = resolveEffectivePlan({ subscription, email: session.user.email })
  if (!planAllowsTrustCircle(plan)) {
    return NextResponse.json(
      {
        error: 'PLAN_LIMIT',
        message: 'Le Réseau de confiance (Trust Circle) est disponible à partir du plan Premium.',
        upgradeUrl: '/pricing',
      },
      { status: 403 },
    )
  }

  const rate = await checkPlanRateLimit('contacts', plan, userId)
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Trop d’ajouts de contacts. Réessayez plus tard.' },
      {
        status: 429,
        headers: rate.retryAfter ? { 'Retry-After': String(rate.retryAfter) } : undefined,
      },
    )
  }

  const result = await addContactToTrustNetwork({
    fromUserId: userId,
    fromUserEmail: session.user.email,
    fromUserName: session.user.name,
    contactEmail: email,
    contactName: name,
    entityType,
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.code,
        message: result.message,
        ...(result.code === 'QUOTA_EXCEEDED' ? { upgradeUrl: '/pricing' } : {}),
      },
      { status: result.status },
    )
  }

  return NextResponse.json({
    success: true,
    trustType:
      result.action === 'mutual'
        ? 'MUTUAL'
        : result.action === 'trust_circle_invite'
          ? 'UNILATERAL'
          : result.action === 'external_invite'
            ? 'UNVERIFIED'
            : 'CONTACT_ONLY',
    message: result.message,
  })
}
