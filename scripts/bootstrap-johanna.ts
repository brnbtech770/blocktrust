/**
 * One-shot : comptes Johanna → plan Prisma B2B_ENTERPRISE + abonnement actif + TrustScore 100 (sans ADMIN_EMAILS).
 * Exécution : npx tsx scripts/bootstrap-johanna.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '../app/lib/db'
import { syncInternalAccountKycByEmail } from '../lib/internal-kyc-verified'

const JOHANNA_EMAILS = ['johannabernabe3@gmail.com', 'johannafartoukh@yahoo.fr'] as const

async function bootstrapJohanna() {
  const enterprisePlan = await prisma.plan.findFirst({
    where: { type: 'B2B_ENTERPRISE', isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!enterprisePlan) {
    console.log('❌ Plan Enterprise non trouvé')
    return
  }

  for (const email of JOHANNA_EMAILS) {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    })

    if (!user) {
      console.log(`⏭️  ${email} — pas encore de compte`)
      continue
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        trustScore: 100,
        trustScoreAt: new Date(),
        planId: enterprisePlan.id,
      },
    })

    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: 'B2B_ENTERPRISE',
        status: 'active',
      },
      update: {
        plan: 'B2B_ENTERPRISE',
        status: 'active',
      },
    })

    const kyc = await syncInternalAccountKycByEmail(email)
    if (kyc.result === 'updated') {
      console.log(`   KYC : User VERIFIED + Entity GOLD`)
    } else if (kyc.result === 'already_verified') {
      console.log(`   KYC : déjà VERIFIED`)
    }

    console.log(`✅ ${email}`)
    console.log(`   Plan : B2B_ENTERPRISE`)
    console.log(`   TrustScore : 100`)
    console.log(`   Dashboard : user standard (pas admin)`)
  }

  console.log('\n🎉 Bootstrap Johanna terminé !')
}

bootstrapJohanna()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
