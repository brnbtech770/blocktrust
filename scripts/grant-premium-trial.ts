/**
 * One-shot : trial Premium 3 mois pour ambassadeurs / beta.
 * Exécution : npx tsx scripts/grant-premium-trial.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'
import {
  grantPremiumTrial,
  PREMIUM_TRIAL_AMBASSADOR_EMAILS,
  PREMIUM_TRIAL_END,
} from '@/lib/premium-trial'

function formatTrialEndFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function main() {
  console.log('🎁 Grant Premium Trial — ambassadeurs\n')
  console.log(`   Fin d'essai : ${formatTrialEndFr(PREMIUM_TRIAL_END)}\n`)

  for (const email of PREMIUM_TRIAL_AMBASSADOR_EMAILS) {
    const result = await grantPremiumTrial({
      email,
      trialEndsAt: PREMIUM_TRIAL_END,
      sendWelcomeEmail: true,
    })

    if (!result.ok) {
      if (result.skipped) {
        console.log(`⏭️  ${email} — ${result.reason}`)
      } else {
        console.log(`❌ ${email} — ${result.reason}`)
      }
      continue
    }

    console.log(
      `[${email}] → Premium Trial jusqu'au ${formatTrialEndFr(result.trialEndsAt)}` +
        (result.welcomeEmailSent ? ' (email bienvenue envoyé)' : ' (email déjà envoyé)'),
    )
  }

  console.log('\n✅ Script terminé.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
