/**
 * One-shot : pour chaque email listé dans ADMIN_EMAILS, applique le même bootstrap que
 * scripts/bootstrap-admin.ts (plan Prisma B2B_ENTERPRISE + abonnement actif + TrustScore 100).
 * Exécution : npx tsx scripts/bootstrap-all-admins.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { getAdminEmailList } from '../lib/admin-utils'
import { prisma } from '../app/lib/db'

async function bootstrapAllAdmins() {
  const emails = getAdminEmailList()
  if (emails.length === 0) {
    console.log(
      'ADMIN_EMAILS est vide. Ajoutez des emails séparés par des virgules dans .env.local (ex. ADMIN_EMAILS=a@x.com,b@y.com)'
    )
    return
  }

  const enterprisePlan = await prisma.plan.findFirst({
    where: { type: 'B2B_ENTERPRISE', isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!enterprisePlan) {
    console.log(
      'Plan B2B_ENTERPRISE introuvable ou inactif. Exécutez d’abord : npx tsx scripts/create-plans.ts'
    )
    return
  }

  let updated = 0
  for (const adminEmail of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: adminEmail, mode: 'insensitive' } },
      include: { subscription: true },
    })

    if (!user) {
      console.log('Ignoré (compte absent en base) :', adminEmail)
      continue
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        planId: enterprisePlan.id,
        trustScore: 100,
        trustScoreAt: new Date(),
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

    console.log('Admin mis à jour :', adminEmail)
    console.log('  planId (Prisma) :', enterprisePlan.id, `(${enterprisePlan.name})`)
    console.log('  Subscription.plan : B2B_ENTERPRISE, status: active')
    console.log('  TrustScore : 100')
    updated += 1
  }

  console.log(`\nTerminé — ${updated}/${emails.length} compte(s) mis à jour, ${emails.length} email(s) dans ADMIN_EMAILS`)
}

bootstrapAllAdmins()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
