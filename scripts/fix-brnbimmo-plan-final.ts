// scripts/fix-brnbimmo-plan-final.ts
// Met à jour le plan Famille avec le bon Price ID et associe l'utilisateur
// ============================================================

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const userEmail = 'brnbimmo@gmail.com'
  const stripePriceId = 'price_1SzRMBHYadstuPY8opgfvFx0' // BlockTrust Famille - 14.99€/mois

  console.log('🔧 Correction du plan pour brnbimmo@gmail.com\n')

  // 1. Trouver le plan Famille mensuel
  const famillePlan = await prisma.plan.findFirst({
    where: {
      type: 'B2C_FAMILLE',
      interval: 'MONTHLY',
    },
  })

  if (!famillePlan) {
    console.log('❌ Plan Famille mensuel non trouvé')
    return
  }

  console.log('✅ Plan Famille trouvé:')
  console.log('  ID:', famillePlan.id)
  console.log('  Nom:', famillePlan.name)
  console.log('  Type:', famillePlan.type)
  console.log('  Stripe Price ID actuel:', famillePlan.stripePriceId || '(null)')
  console.log('')

  // 2. Mettre à jour le plan avec le bon Price ID si nécessaire
  if (famillePlan.stripePriceId !== stripePriceId) {
    console.log('🔄 Mise à jour du Stripe Price ID du plan...')
    await prisma.plan.update({
      where: { id: famillePlan.id },
      data: { stripePriceId },
    })
    console.log('✅ Plan mis à jour avec le Price ID:', stripePriceId)
    console.log('')
  } else {
    console.log('✅ Le plan a déjà le bon Stripe Price ID')
    console.log('')
  }

  // 3. Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    console.log('❌ Utilisateur non trouvé')
    return
  }

  console.log('✅ Utilisateur trouvé:')
  console.log('  Email:', user.email)
  console.log('  Plan ID actuel:', user.planId || 'NULL')
  console.log('')

  // 4. Mettre à jour l'utilisateur avec le plan
  if (user.planId !== famillePlan.id) {
    console.log('🔄 Mise à jour du planId de l\'utilisateur...')
    await prisma.user.update({
      where: { id: user.id },
      data: { planId: famillePlan.id },
    })
    console.log('✅ Utilisateur mis à jour!')
    console.log(`   Ancien planId: ${user.planId || 'NULL'}`)
    console.log(`   Nouveau planId: ${famillePlan.id}`)
    console.log(`   Plan: ${famillePlan.name}`)
  } else {
    console.log('✅ L\'utilisateur a déjà le bon planId')
  }

  // 5. Vérification finale
  const updatedUser = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { plan: true },
  })

  console.log('\n' + '='.repeat(60))
  console.log('📊 Vérification finale:')
  console.log('  Email:', updatedUser?.email)
  console.log('  Plan ID:', updatedUser?.planId || 'NULL')
  if (updatedUser?.plan) {
    console.log('  Plan:', updatedUser.plan.name)
    console.log('  Type:', updatedUser.plan.type)
    console.log('  Stripe Price ID:', updatedUser.plan.stripePriceId || '(null)')
  }
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
