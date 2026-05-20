/**
 * Audit badge admin — entités, certificats actifs, signatures.
 * Exécution : npx tsx scripts/check-admin-badge.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '../app/lib/db'

async function checkAdminBadge() {
  const ADMIN_EMAILS = [
    'brnbtech@gmail.com',
    'laurianne@winter-keys.com',
    'deborahbernabe@gmail.com',
    'shai270202@gmail.com',
  ]

  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        entities: {
          include: {
            certificates: {
              include: { signatures: true },
            },
          },
        },
      },
    })

    if (!user) {
      console.log(`❌ ${email} — USER INTROUVABLE`)
      continue
    }

    const certs = user.entities.flatMap((e) => e.certificates)
    const activeCerts = certs.filter((c) => ['ACTIVE', 'ANCHORED'].includes(c.status))
    const hasSig = activeCerts.some((c) => c.signatures?.length > 0)

    console.log(`\n${email}`)
    console.log(`  userId: ${user.id}`)
    console.log(`  Entités: ${user.entities.length}`)
    console.log(`  Certificats total: ${certs.length}`)
    console.log(`  Certificats actifs: ${activeCerts.length}`)
    console.log(`  A une signature: ${hasSig}`)
    if (activeCerts[0]) {
      console.log(`  publicId: ${activeCerts[0].publicId}`)
      console.log(`  status: ${activeCerts[0].status}`)
    }
  }
}

checkAdminBadge()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
