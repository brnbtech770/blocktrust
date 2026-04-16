/**
 * One-shot : supprime les comptes suspects (sans abonnement, critères heuristiques).
 * Exécution : npx tsx scripts/cleanup-bots.ts
 */
import 'dotenv/config'
import { prisma } from '../app/lib/db'
import { deleteUserAdmin } from '../lib/admin-delete-user'
import { isAdmin } from '../app/lib/admin'

async function main() {
  const since = new Date('2026-04-01T00:00:00.000Z')

  const suspiciousUsers = await prisma.user.findMany({
    where: {
      AND: [
        { subscription: { is: null } },
        { createdAt: { gte: since } },
        {
          OR: [
            {
              AND: [{ name: { not: null } }, { NOT: { name: { contains: ' ' } } }],
            },
            { email: { contains: '.a', mode: 'insensitive' } },
            { email: { contains: '.o', mode: 'insensitive' } },
            { email: { contains: '.u', mode: 'insensitive' } },
          ],
        },
      ],
    },
    include: { subscription: true },
  })

  console.log(`${suspiciousUsers.length} comptes suspects trouvés`)
  for (const u of suspiciousUsers) {
    console.log(u.email, u.name, u.createdAt.toISOString())
  }

  for (const user of suspiciousUsers) {
    if (isAdmin(user.email)) {
      console.log(`Ignoré (admin) : ${user.email}`)
      continue
    }
    const sub = user.subscription
    if (sub && sub.status === 'active') {
      console.log(`Ignoré (abonnement actif) : ${user.email}`)
      continue
    }
    try {
      await deleteUserAdmin(user.id)
      console.log(`Supprimé : ${user.email}`)
    } catch (e) {
      console.error(`Erreur suppression ${user.email}`, e)
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
