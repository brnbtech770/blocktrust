// scripts/check-user-brnbimmo.ts
// Vérifie les données de l'utilisateur brnbimmo@gmail.com
// ============================================================

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Recherche de l\'utilisateur brnbimmo@gmail.com...\n')

  const user = await prisma.user.findUnique({
    where: { email: 'brnbimmo@gmail.com' },
    include: {
      plan: true,
    },
  })

  if (!user) {
    console.log('❌ Utilisateur non trouvé avec l\'email: brnbimmo@gmail.com')
    
    // Chercher des variantes
    const similarUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'brnbimmo',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        planId: true,
      },
    })

    if (similarUsers.length > 0) {
      console.log('\n📋 Utilisateurs similaires trouvés:')
      similarUsers.forEach((u) => {
        console.log(`  - ${u.email} (ID: ${u.id}, planId: ${u.planId})`)
      })
    }
  } else {
    console.log('✅ Utilisateur trouvé:\n')
    console.log('📧 Email exact:', user.email)
    console.log('👤 Nom:', user.name || '(non renseigné)')
    console.log('🆔 ID:', user.id)
    console.log('📅 Créé le:', user.createdAt.toISOString())
    console.log('💳 Stripe Customer ID:', user.stripeCustomerId || '(null)')
    console.log('\n📦 Plan:')
    console.log('  planId:', user.planId || 'NULL')
    
    if (user.planId && user.plan) {
      console.log('  ✅ Plan associé trouvé:')
      console.log('    - ID:', user.plan.id)
      console.log('    - Nom:', user.plan.name)
      console.log('    - Type:', user.plan.type)
      console.log('    - Prix:', user.plan.price.toNumber(), '€')
      console.log('    - Intervalle:', user.plan.interval)
      console.log('    - Max Entités:', user.plan.maxEntities)
      console.log('    - Max Certificats:', user.plan.maxCertificates)
      console.log('    - Trust Circle:', user.plan.trustCircleEnabled ? '✅ Activé' : '❌ Désactivé')
      console.log('    - Stripe Price ID:', user.plan.stripePriceId || '(non renseigné)')
    } else if (user.planId && !user.plan) {
      console.log('  ⚠️  planId existe mais le Plan n\'a pas été trouvé!')
      console.log('  planId:', user.planId)
    } else {
      console.log('  ❌ Aucun plan associé (planId est NULL)')
    }

    // Vérifier les entités
    const entities = await prisma.entity.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        entityType: true,
        legalName: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    console.log('\n🏢 Entités:', entities.length)
    entities.forEach((entity, index) => {
      const name = entity.entityType === 'INDIVIDUAL'
        ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
        : entity.legalName || entity.email
      console.log(`  ${index + 1}. ${name} (${entity.entityType})`)
    })
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
