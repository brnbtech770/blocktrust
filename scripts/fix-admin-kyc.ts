/**
 * One-shot : KYC VERIFIED + Entity Enterprise pour tous les comptes admin + Johanna (9 emails).
 * Idempotent — safe à relancer.
 * Exécution : npx tsx scripts/fix-admin-kyc.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'
import {
  getInternalKycEmailList,
  syncInternalAccountKycByEmail,
} from '@/lib/internal-kyc-verified'

async function fixAdminKyc() {
  const emails = getInternalKycEmailList()
  console.log(`\n🔐 Sync KYC interne — ${emails.length} email(s)\n`)

  let updated = 0
  let already = 0
  let missing = 0

  for (const email of emails) {
    const detail = await syncInternalAccountKycByEmail(email)

    if (detail.result === 'not_found') {
      console.log(`${email} → utilisateur non trouvé`)
      missing += 1
      continue
    }

    if (detail.result === 'already_verified') {
      console.log(`${email} → déjà VERIFIED`)
      already += 1
      continue
    }

    const parts: string[] = []
    if (detail.userUpdated) parts.push('User.kycStatus=VERIFIED')
    if (detail.entitiesUpdated > 0) {
      parts.push(`${detail.entitiesUpdated} Entity → VERIFIED/Enterprise`)
    }
    console.log(`${email} → mis à jour (${parts.join(', ') || 'sync'})`)
    updated += 1
  }

  console.log(
    `\nTerminé — ${updated} mis à jour, ${already} déjà VERIFIED, ${missing} utilisateur(s) non trouvé(s)\n`
  )
}

fixAdminKyc()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
