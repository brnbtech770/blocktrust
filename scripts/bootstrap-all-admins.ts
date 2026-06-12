/**
 * One-shot : bootstrap Enterprise + KYC VERIFIED pour tous les comptes internes (9 emails).
 * Exécution : npx tsx scripts/bootstrap-all-admins.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { getAllInternalEmails } from '@/lib/admin-utils'
import { ensureAdminCapabilities } from '@/lib/admin-bootstrap'
import { prisma } from '@/app/lib/db'

async function bootstrapAllAdmins() {
  const emails = getAllInternalEmails()
  console.log(`\n🔄 Bootstrap comptes internes — ${emails.length} email(s)\n`)

  let updated = 0
  let missing = 0

  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      console.log(`${email} → utilisateur non trouvé`)
      missing += 1
      continue
    }

    await ensureAdminCapabilities(user.id, user.email ?? email, user.name)
    console.log(`${email} → Enterprise + KYC VERIFIED`)
    updated += 1
  }

  console.log(
    `\nTerminé — ${updated}/${emails.length} mis à jour, ${missing} absent(s)\n`
  )
}

bootstrapAllAdmins()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
