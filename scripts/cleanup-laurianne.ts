/**
 * Liste les profils liés à Laurianne (recherche email).
 * Exécution : npx tsx scripts/cleanup-laurianne.ts
 */
import 'dotenv/config'
import { prisma } from '../app/lib/db'

async function cleanupLaurianne() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'laurianne' } },
        { email: { contains: 'winter-keys' } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\n${users.length} profil(s) trouvé(s) :\n`)
  users.forEach((u, i) => {
    console.log(
      `${i + 1}. ${u.email}` +
        `\n   Nom : ${u.name || '—'}` +
        `\n   ID  : ${u.id}` +
        `\n   Créé : ${u.createdAt.toLocaleDateString('fr-FR')}\n`
    )
  })
}

cleanupLaurianne()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
