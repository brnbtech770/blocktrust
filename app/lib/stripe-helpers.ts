// app/lib/stripe-helpers.ts
// Helpers pour vérifier et mettre à jour les plans depuis Stripe
// ============================================================

import { stripe } from '@/lib/stripe'
import { prisma } from './db'
import { findPlanFromPriceId } from './auth'

/**
 * Vérifie si un utilisateur a une subscription active dans Stripe
 * et met à jour son planId si nécessaire
 */
export async function checkAndUpdateUserPlan(userId: string, stripeCustomerId: string | null): Promise<string | null> {
  if (!stripeCustomerId) {
    return null
  }

  try {
    // Vérifier si l'utilisateur a une subscription active dans Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      // Pas de subscription active
      return null
    }

    const subscription = subscriptions.data[0]
    const priceId = subscription.items.data[0]?.price.id

    if (!priceId) {
      return null
    }

    // Trouver le planId depuis le priceId Stripe
    const planId = await findPlanFromPriceId(priceId)

    if (!planId) {
      return null
    }

    // Vérifier si le planId est déjà à jour
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planId: true },
    })

    if (user?.planId === planId) {
      // Déjà à jour
      return planId
    }

    // Mettre à jour le planId
    await prisma.user.update({
      where: { id: userId },
      data: { planId },
    })

    console.log(`✅ Plan mis à jour pour user=${userId.slice(0, 8)}... → ${planId}`)
    return planId
  } catch (error) {
    console.error('❌ Erreur lors de la vérification Stripe:', error)
    return null
  }
}

/**
 * Vérifie si un utilisateur a un plan actif (depuis DB ou Stripe)
 */
export async function hasActivePlan(userId: string, stripeCustomerId: string | null): Promise<boolean> {
  // D'abord vérifier dans la DB
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planId: true },
  })

  if (user?.planId) {
    return true
  }

  // Si pas de planId, vérifier dans Stripe
  if (stripeCustomerId) {
    const planId = await checkAndUpdateUserPlan(userId, stripeCustomerId)
    return planId !== null
  }

  return false
}
