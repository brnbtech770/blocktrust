import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'olivier@blocktrust.tech' },
    select: {
      id: true,
      email: true,
      name: true,
      planId: true,
      plan: {
        select: {
          name: true,
          type: true,
        },
      },
      stripeCustomerId: true,
      createdAt: true,
    },
  })

  console.log('\n📊 Utilisateur olivier@blocktrust.tech:')
  console.log('=====================================')
  
  if (user) {
    console.log(`✅ Utilisateur trouvé`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Nom: ${user.name || 'Non renseigné'}`)
    console.log(`   PlanId: ${user.planId || 'Non renseigné'}`)
    console.log(`   Plan: ${user.plan ? `${user.plan.name} (${user.plan.type})` : 'Aucun'}`)
    console.log(`   stripeCustomerId: ${user.stripeCustomerId || '❌ NON RENSEIGNÉ'}`)
    console.log(`   Créé le: ${user.createdAt.toLocaleString('fr-FR')}`)
    
    console.log('\n📋 Résumé:')
    if (user.stripeCustomerId) {
      console.log('   ✅ stripeCustomerId est renseigné')
    } else {
      console.log('   ❌ stripeCustomerId n\'est PAS renseigné')
    }
    
    if (user.plan) {
      console.log(`   ✅ Plan: ${user.plan.name} (${user.plan.type})`)
    } else {
      console.log('   ⚠️  Plan non renseigné')
    }
  } else {
    console.log('❌ Utilisateur non trouvé')
  }
  
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error('Erreur:', e)
    process.exit(1)
  })
