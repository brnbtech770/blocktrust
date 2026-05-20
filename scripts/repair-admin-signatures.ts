/**
 * Répare les signatures badge manquantes pour les comptes admin / pro.
 * Exécution : npx tsx scripts/repair-admin-signatures.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '../app/lib/db'
import { isAdmin } from '../lib/admin-utils'

const ADMIN_EMAILS = [
  'brnbtech@gmail.com',
  'laurianne@winter-keys.com',
  'deborahbernabe@gmail.com',
  'shai270202@gmail.com',
  'brnbimmo@gmail.com',
]

async function repairSignatures() {
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
              where: {
                status: { in: ['ACTIVE', 'ANCHORED'] },
              },
              include: { signatures: true },
              take: 1,
              orderBy: { issuedAt: 'desc' },
            },
          },
        },
      },
    })

    if (!user) {
      console.log(`⏭️  ${email} — pas de compte`)
      continue
    }

    const cert = user.entities.flatMap((e) => e.certificates)[0]

    if (!cert) {
      console.log(`⚠️  ${email} — pas de certificat actif`)
      continue
    }

    const hasSig = cert.signatures?.some((s) => s.purpose === 'badge')

    if (hasSig) {
      console.log(`✅ ${email} — signature OK`)
      continue
    }

    const { ensureAdminCapabilities, ensureAdminCertificate } = await import('../lib/admin-bootstrap')

    if (isAdmin(email)) {
      await ensureAdminCapabilities(user.id, email, user.name ?? '').catch(() => null)
    } else {
      await ensureAdminCertificate(user.id, user.name ?? email, email).catch(() => null)
    }

    console.log(`🔧 ${email} — signature réparée`)
  }
}

repairSignatures()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
