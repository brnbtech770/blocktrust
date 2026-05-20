/**
 * Affiche les comptes pro Olivier et supprime les comptes test vides.
 * Exécution : npx tsx scripts/cleanup-test-accounts.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'

const ACCOUNTS_TO_DELETE = [
  '1rst.invest@gmail.com', // compte test TATA GEORGETTE
]

const ACCOUNTS_TO_SHOW = [
  'contact@brnb.fr', // pro immo Olivier
  'brnbimmo@gmail.com', // pro immo Olivier
]

async function countUserCertificates(userId: string): Promise<number> {
  return prisma.certificate
    .count({ where: { entity: { userId } } })
    .catch(() => 0)
}

async function cleanup() {
  console.log('\n=== COMPTES À AFFICHER ===')
  for (const email of ACCOUNTS_TO_SHOW) {
    const user = await prisma.user
      .findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              entities: true,
            },
          },
        },
      })
      .catch(() => null)

    if (user) {
      const certCount = await countUserCertificates(user.id)
      console.log(`\n${user.email} — ${user.name}`)
      console.log(`  Contacts: ${user._count.entities}`)
      console.log(`  Certificats: ${certCount}`)
      console.log(`  Créé: ${user.createdAt.toLocaleDateString('fr-FR')}`)
    } else {
      console.log(`\n${email} — PAS DE COMPTE`)
    }
  }

  console.log('\n=== COMPTES À SUPPRIMER ===')
  for (const email of ACCOUNTS_TO_DELETE) {
    const user = await prisma.user
      .findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          _count: {
            select: {
              entities: true,
            },
          },
        },
      })
      .catch(() => null)

    if (user) {
      const certCount = await countUserCertificates(user.id)
      console.log(`\n${user.email} — ${user.name}`)
      console.log(`  Contacts: ${user._count.entities}`)
      console.log(`  Certificats: ${certCount}`)

      if (user._count.entities === 0 && certCount === 0) {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => null)
        console.log('  ✅ SUPPRIMÉ')
      } else {
        console.log('  ⚠️ A des données — supprimer manuellement')
      }
    } else {
      console.log(`\n${email} — PAS DE COMPTE`)
    }
  }
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
