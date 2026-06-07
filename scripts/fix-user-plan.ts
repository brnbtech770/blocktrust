// scripts/fix-user-plan.ts
// Script pour associer manuellement un plan à un utilisateur
// ============================================================

import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'

async function main() {
  const email = 'brnbimmo@gmail.com'
  
  // Vérifier si l'utilisateur existe
  const user = await prisma.user.findUnique({
    where: { email },
    include: { plan: true },
  })

  if (!user) {
    console.log(`❌ Utilisateur ${email} non trouvé`)
    return
  }

  console.log(`📋 Utilisateur trouvé: ${user.email}`)
  console.log(`   Plan actuel: ${user.planId ? user.plan?.name || 'ID: ' + user.planId : 'AUCUN'}`)

  // Si l'utilisateur a déjà un plan, on ne fait rien
  if (user.planId) {
    console.log(`✅ L'utilisateur a déjà un plan: ${user.plan?.name}`)
    return
  }

  // Trouver le plan Premium (ou celui souscrit)
  // Vous pouvez modifier le type selon le plan souscrit
  const plan = await prisma.plan.findFirst({
    where: { 
      type: 'B2C_PREMIUM',
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!plan) {
    console.log(`❌ Plan B2C_PREMIUM non trouvé`)
    console.log(`   Plans disponibles:`)
    const allPlans = await prisma.plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
    })
    allPlans.forEach(p => {
      console.log(`   - ${p.name} (${p.type}) - ID: ${p.id}`)
    })
    return
  }

  // Associer le plan à l'utilisateur
  const updated = await prisma.user.update({
    where: { email },
    data: { planId: plan.id },
    include: { plan: true },
  })

  console.log(`✅ Utilisateur mis à jour:`)
  console.log(`   Email: ${updated.email}`)
  console.log(`   Plan: ${updated.plan?.name} (${updated.plan?.type})`)
  console.log(`   PlanId: ${updated.planId}`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
