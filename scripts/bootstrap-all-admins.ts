/**
 * One-shot : pour chaque email listé dans ADMIN_EMAILS, applique le même bootstrap que
 * scripts/bootstrap-admin.ts (plan Prisma B2B_ENTERPRISE + abonnement actif + TrustScore 100).
 * Exécution : npx tsx scripts/bootstrap-all-admins.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { getAdminEmailList } from '../lib/admin-utils'
import { ensureAdminCapabilities } from '../lib/admin-bootstrap'
import { prisma } from '../app/lib/db'

/** Liste canonique — doit rester alignée avec ADMIN_EMAILS (Vercel). */
const ADMIN_EMAILS = [
  'brnbtech@gmail.com',
  'laurianne@winter-keys.com',
  'deborahbernabe@gmail.com',
  'shai270202@gmail.com',
  'brnbimmo@gmail.com',
  'contact@brnb.fr',
  'bernabeshai56@gmail.com',
] as const

const OLIVER_PRO_EMAILS = ['brnbimmo@gmail.com', 'contact@brnb.fr'] as const

async function bootstrapEnterpriseProAccount(
  email: string,
  enterprisePlan: { id: string; name: string }
): Promise<boolean> {
  const user = await prisma.user
    .findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { subscription: true },
    })
    .catch(() => null)

  if (!user) {
    console.log('Ignoré (compte absent en base) :', email)
    return false
  }

  await prisma.user
    .update({
      where: { id: user.id },
      data: {
        planId: enterprisePlan.id,
        trustScore: 100,
        trustScoreAt: new Date(),
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

  console.log('Compte pro mis à jour :', email)
  console.log('  planId (Prisma) :', enterprisePlan.id, `(${enterprisePlan.name})`)
  console.log('  Subscription.plan : B2B_ENTERPRISE, status: active')
  console.log('  TrustScore : 100')
  console.log('  Droits admin : non')
  return true
}

async function bootstrapAllAdmins() {
  const fromEnv = getAdminEmailList()
  const emails = fromEnv.length > 0 ? fromEnv : [...ADMIN_EMAILS]
  if (fromEnv.length === 0) {
    console.log(
      'ADMIN_EMAILS (env) vide — utilisation de la liste canonique du script (', emails.length, 'emails )'
    )
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

    await ensureAdminCapabilities(user.id, adminEmail, user.name)

    console.log('Admin mis à jour :', adminEmail)
    updated += 1
  }

  let proUpdated = 0
  for (const proEmail of OLIVER_PRO_EMAILS) {
    const ok = await bootstrapEnterpriseProAccount(proEmail, enterprisePlan)
    if (ok) proUpdated += 1
  }

  console.log(
    `\nTerminé — ${updated}/${emails.length} admin(s) mis à jour, ${proUpdated}/${OLIVER_PRO_EMAILS.length} compte(s) pro Olivier`
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
