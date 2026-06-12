/**
 * One-shot : force le compte admin listé sur le plan Prisma B2B_ENTERPRISE + abonnement actif + TrustScore 100.
 * Exécution : npx tsx scripts/bootstrap-admin.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '../app/lib/db'
import { ensureAdminCapabilities } from '../lib/admin-bootstrap'

const ADMIN_EMAIL = 'brnbtech@gmail.com'

async function bootstrapAdmin() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: ADMIN_EMAIL, mode: 'insensitive' } },
    include: { subscription: true },
  })

  if (!user) {
    console.log('Utilisateur non trouvé :', ADMIN_EMAIL)
    return
  }

  const enterprisePlan = await prisma.plan.findFirst({
    where: { type: 'B2B_ENTERPRISE', isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!enterprisePlan) {
    console.log('Plan B2B_ENTERPRISE introuvable ou inactif. Exécutez d’abord : npx tsx scripts/create-plans.ts')
    return
  }

  await ensureAdminCapabilities(user.id, ADMIN_EMAIL, user.name)

  console.log('Admin mis à jour :', ADMIN_EMAIL)
  console.log('  planId (Prisma) :', enterprisePlan.id, `(${enterprisePlan.name})`)
  console.log('  Subscription.plan : B2B_ENTERPRISE, status: active')
  console.log('  TrustScore : 100')
  console.log('  KYC : User VERIFIED + Entity Enterprise')
}

bootstrapAdmin()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
