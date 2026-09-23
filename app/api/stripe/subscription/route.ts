// app/api/stripe/subscription/route.ts
// Retourne le status de l'abonnement de l'utilisateur
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'
import { getPlanDisplayLabel, planAllowsPolygonAnchoring, planAllowsTrustCircle, resolveEffectivePlan } from '@/lib/plan-features'
import { getMaxCertificates } from '@/lib/checkQuota'
import { getMaxContacts } from '@/lib/pricing'
import { btErrorDevDetails } from '@/lib/prodLog'

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification
    // TODO: Remplacer par getServerSession(authOptions) quand NextAuth sera implémenté
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user.email) {
      return NextResponse.json({ error: 'Utilisateur invalide' }, { status: 400 })
    }

    // Récupérer l'utilisateur avec son plan
    const userWithPlan = await prisma.user.findUnique({
      where: { id: user.id },
      include: { plan: true },
    })

    if (!userWithPlan) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Calculer l'usage (toujours disponible)
    const entitiesCount = await prisma.entity.count({
      where: { userId: user.id },
    })

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const certificatesThisMonth = await prisma.certificate.count({
      where: {
        entity: {
          userId: user.id,
        },
        issuedAt: {
          gte: startOfMonth,
        },
      },
    })

    // Plan réel résolu (source unique) + libellé affiché (Compte interne pour admins/Johanna).
    const subForLabel = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, status: true, stripeSubscriptionId: true, currentPeriodEnd: true },
    })
    const planCode = resolveEffectivePlan({
      subscription: subForLabel,
      email: userWithPlan.email,
    })
    const planLabel = getPlanDisplayLabel(planCode, { email: userWithPlan.email })

    const limits = {
      maxEntities: getMaxContacts(planCode),
      maxCertificates: getMaxCertificates(planCode),
      trustCircleEnabled: planAllowsTrustCircle(planCode),
      blockchainAnchor: planAllowsPolygonAnchoring(planCode),
    }

    // Si pas de stripeCustomerId, pas d'abonnement
    if (!userWithPlan.stripeCustomerId) {
      return NextResponse.json({
        hasSubscription: false,
        plan: userWithPlan.plan || { type: planCode, name: planLabel, trustCircleEnabled: false },
        planCode,
        planLabel,
        subscription: null,
        usage: {
          entitiesCount,
          certificatesThisMonth,
        },
        limits,
      })
    }

    const customerId = userWithPlan.stripeCustomerId

    // Récupérer l'abonnement Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    })

    const subscription = subscriptions.data[0]

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        plan: userWithPlan.plan || { type: planCode, name: planLabel, trustCircleEnabled: false },
        planCode,
        planLabel,
        subscription: null,
        usage: {
          entitiesCount,
          certificatesThisMonth,
        },
        limits,
      })
    }

    // Calculer les infos utiles
    const currentPeriodEnd = new Date(
      (subscription as unknown as { current_period_end: number }).current_period_end * 1000
    )
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null
    const cancelAtPeriodEnd = subscription.cancel_at_period_end

    return NextResponse.json({
      hasSubscription: true,
      plan: userWithPlan.plan || { type: planCode, name: planLabel, trustCircleEnabled: false },
      planCode,
      planLabel,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        trialEnd: trialEnd?.toISOString() || null,
        cancelAtPeriodEnd,
        cancelAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
      },
      usage: {
        entitiesCount,
        certificatesThisMonth,
      },
      limits,
    })
  } catch (error: unknown) {
    btErrorDevDetails(error, 'Erreur récupération abonnement')
    return NextResponse.json(
      { 
        error: 'Erreur récupération abonnement',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    )
  }
}
