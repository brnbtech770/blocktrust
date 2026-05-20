/**
 * One-shot : comptes pro immo Olivier → plan Enterprise + TrustScore 100 (sans ADMIN_EMAILS).
 * Exécution : npx tsx scripts/bootstrap-olivier-pro.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'

const OLIVER_PRO_EMAILS = ['brnbimmo@gmail.com', 'contact@brnb.fr'] as const

async function bootstrapOlivierPro() {
  const enterprisePlan = await prisma.plan
    .findFirst({
      where: { type: 'B2B_ENTERPRISE', isActive: true },
      orderBy: { createdAt: 'asc' },
    })
    .catch(() => null)

  if (!enterprisePlan) {
    console.log('❌ Plan Enterprise non trouvé')
    return
  }

  for (const email of OLIVER_PRO_EMAILS) {
    const user = await prisma.user
      .findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
      })
      .catch(() => null)

    if (!user) {
      console.log(`⏭️  ${email} — pas encore de compte`)
      continue
    }

    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          trustScore: 100,
          trustScoreAt: new Date(),
          planId: enterprisePlan.id,
        },
      })
      .catch(() => null)

    await prisma.subscription
      .upsert({
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
      .catch(() => null)

    console.log(`✅ ${email}`)
    console.log('   Plan : B2B_ENTERPRISE')
    console.log('   TrustScore : 100')
    console.log('   Dashboard : user standard (pas admin)')
  }

  console.log('\n🎉 Bootstrap comptes pro Olivier terminé !')
}

bootstrapOlivierPro()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
