import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      stripeCustomerId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log('\n📊 Liste des utilisateurs:')
  console.log('==========================\n')
  
  if (users.length === 0) {
    console.log('❌ Aucun utilisateur trouvé dans la base de données')
  } else {
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Nom: ${user.name || 'Non renseigné'}`)
      console.log(`   Plan: ${user.plan || 'Non renseigné'}`)
      console.log(`   stripeCustomerId: ${user.stripeCustomerId || '❌ NON RENSEIGNÉ'}`)
      console.log(`   Créé le: ${user.createdAt.toLocaleString('fr-FR')}`)
      console.log('')
    })
  }
  
  await prisma.$disconnect()
}

main()
  .catch((e) => {
    console.error('Erreur:', e)
    process.exit(1)
  })
