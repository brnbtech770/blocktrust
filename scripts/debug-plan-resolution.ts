/**
 * Debug résolution plan pour emails donnés.
 * Usage : npx tsx scripts/debug-plan-resolution.ts [email...]
 */
import * as dotenv from 'dotenv'

const useProd = process.argv.includes('--prod')
dotenv.config({ path: useProd ? '.env.production.local' : '.env.local', override: useProd })
dotenv.config()

import { prisma } from '@/app/lib/db'
import { resolveEffectivePlan } from '@/lib/plan-features'
import { PREMIUM_TRIAL_AMBASSADOR_EMAILS } from '@/lib/premium-trial'

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--prod')
  const emails =
    args.length > 0 ? args.map((e) => e.trim().toLowerCase()) : [...PREMIUM_TRIAL_AMBASSADOR_EMAILS]

  for (const email of emails) {
    const u = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        createdAt: true,
        plan: { select: { type: true, name: true } },
        subscription: true,
      },
    })

    if (!u) {
      console.log(`\n${email}: user absent`)
      continue
    }

    const sub = u.subscription
    const resolved = resolveEffectivePlan({
      subscription: sub,
      email: u.email,
      planType: u.plan?.type,
    })

    console.log(`\n── ${email} ──`)
    console.log('createdAt:', u.createdAt.toISOString())
    console.log('user.plan.type:', u.plan?.type ?? '—')
    console.log('subscription:', sub
      ? {
          plan: sub.plan,
          status: sub.status,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        }
      : 'absent')
    console.log('resolveEffectivePlan →', resolved)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
