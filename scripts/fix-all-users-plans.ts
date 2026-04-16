// scripts/fix-all-users-plans.ts
// Script pour corriger le planId de tous les utilisateurs avec subscription Stripe active
// ============================================================

import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { findPlanFromPriceId } from '../app/lib/auth'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

async function main() {
  console.log('🔍 Recherche des utilisateurs avec stripeCustomerId mais sans planId...\n')

  // Trouver tous les utilisateurs avec stripeCustomerId mais sans planId
  const users = await prisma.user.findMany({
    where: {
      stripeCustomerId: { not: null },
      planId: null,
    },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
    },
  })

  if (users.length === 0) {
    console.log('✅ Aucun utilisateur à corriger')
    return
  }

  console.log(`📋 ${users.length} utilisateur(s) trouvé(s) sans planId\n`)

  let updated = 0
  let errors = 0

  for (const user of users) {
    if (!user.stripeCustomerId) continue

    try {
      console.log(`🔍 Vérification de ${user.email}...`)

      // Vérifier si l'utilisateur a une subscription active dans Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1,
      })

      if (subscriptions.data.length === 0) {
        console.log(`   ⚠️  Pas de subscription active pour ${user.email}`)
        continue
      }

      const subscription = subscriptions.data[0]
      const priceId = subscription.items.data[0]?.price.id

      if (!priceId) {
        console.log(`   ⚠️  Pas de priceId trouvé pour ${user.email}`)
        continue
      }

      // Trouver le planId depuis le priceId Stripe
      const planId = await findPlanFromPriceId(priceId)

      if (!planId) {
        console.log(`   ⚠️  Plan non trouvé pour priceId ${priceId} (${user.email})`)
        continue
      }

      // Mettre à jour le planId
      await prisma.user.update({
        where: { id: user.id },
        data: { planId },
      })

      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        select: { name: true, type: true },
      })

      console.log(`   ✅ ${user.email} → Plan ${plan?.name} (${plan?.type})`)
      updated++
    } catch (error: any) {
      console.error(`   ❌ Erreur pour ${user.email}:`, error.message)
      errors++
    }
  }

  console.log(`\n📊 Résumé:`)
  console.log(`   ✅ ${updated} utilisateur(s) mis à jour`)
  if (errors > 0) {
    console.log(`   ❌ ${errors} erreur(s)`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
