// scripts/fix-brnbimmo-plan.ts
// Vérifie l'abonnement Stripe et met à jour le planId
// ============================================================

import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

async function main() {
  console.log('🔍 Vérification de l\'utilisateur brnbimmo@gmail.com...\n')

  const user = await prisma.user.findUnique({
    where: { email: 'brnbimmo@gmail.com' },
  })

  if (!user) {
    console.log('❌ Utilisateur non trouvé')
    return
  }

  console.log('✅ Utilisateur trouvé:')
  console.log('  Email:', user.email)
  console.log('  Stripe Customer ID:', user.stripeCustomerId || '(null)')
  console.log('  Plan ID actuel:', user.planId || 'NULL\n')

  if (!user.stripeCustomerId) {
    console.log('❌ Pas de Stripe Customer ID, impossible de vérifier l\'abonnement')
    return
  }

  // Vérifier les abonnements Stripe
  console.log('🔍 Vérification des abonnements Stripe...\n')
  
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'all',
    limit: 10,
  })

  console.log(`📊 Abonnements trouvés: ${subscriptions.data.length}\n`)

  if (subscriptions.data.length === 0) {
    console.log('⚠️  Aucun abonnement trouvé dans Stripe')
    return
  }

  // Afficher tous les abonnements
  subscriptions.data.forEach((sub, index) => {
    console.log(`Abonnement ${index + 1}:`)
    console.log('  ID:', sub.id)
    console.log('  Statut:', sub.status)
    console.log('  Price ID:', sub.items.data[0]?.price.id)
    console.log('  Créé le:', new Date(sub.created * 1000).toISOString())
    if (sub.cancel_at_period_end) {
      console.log('  ⚠️  Annulation programmée à la fin de période')
    }
    console.log('')
  })

  // Trouver l'abonnement actif
  const activeSubscription = subscriptions.data.find(
    (sub) => sub.status === 'active' || sub.status === 'trialing'
  )

  if (!activeSubscription) {
    console.log('❌ Aucun abonnement actif trouvé')
    console.log('   Statuts trouvés:', subscriptions.data.map((s) => s.status).join(', '))
    return
  }

  const priceId = activeSubscription.items.data[0]?.price.id
  if (!priceId) {
    console.log('❌ Impossible de récupérer le Price ID')
    return
  }

  console.log('✅ Abonnement actif trouvé:')
  console.log('  Subscription ID:', activeSubscription.id)
  console.log('  Price ID:', priceId)
  console.log('  Statut:', activeSubscription.status)
  console.log('')

  // Trouver le plan correspondant
  const plan = await prisma.plan.findFirst({
    where: { stripePriceId: priceId },
  })

  if (!plan) {
    console.log('❌ Aucun plan trouvé avec ce Stripe Price ID:', priceId)
    console.log('\n📋 Plans disponibles dans la base:')
    const allPlans = await prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        stripePriceId: true,
      },
    })
    allPlans.forEach((p) => {
      console.log(`  - ${p.name} (${p.type}): ${p.stripePriceId || '(pas de stripePriceId)'}`)
    })
    return
  }

  console.log('✅ Plan trouvé:')
  console.log('  ID:', plan.id)
  console.log('  Nom:', plan.name)
  console.log('  Type:', plan.type)
  console.log('')

  // Mettre à jour l'utilisateur
  if (user.planId === plan.id) {
    console.log('✅ L\'utilisateur a déjà le bon planId')
  } else {
    console.log('🔄 Mise à jour du planId...')
    await prisma.user.update({
      where: { id: user.id },
      data: { planId: plan.id },
    })
    console.log('✅ PlanId mis à jour avec succès!')
    console.log(`   Ancien planId: ${user.planId || 'NULL'}`)
    console.log(`   Nouveau planId: ${plan.id}`)
  }

  console.log('\n' + '='.repeat(60))
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
