/**
 * Diagnostic trial Premium ambassadeurs (sans colonnes invalides).
 * Usage : npx tsx scripts/diagnose-premium-trial.ts [email...]
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'
import { PREMIUM_TRIAL_AMBASSADOR_EMAILS, isPremiumTrialSubscription } from '@/lib/premium-trial'
import { resolveEffectivePlan } from '@/lib/plan-features'

async function main() {
  const args = process.argv.slice(2)
  const emails =
    args.length > 0 ? args.map((e) => e.trim().toLowerCase()) : [...PREMIUM_TRIAL_AMBASSADOR_EMAILS]

  for (const email of emails) {
    console.log(`\n── ${email} ──`)

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        plan: true,
        subscription: true,
        entities: {
          include: {
            certificates: {
              include: {
                signatures: { where: { purpose: 'badge' }, select: { signature: true } },
              },
            },
          },
        },
      },
    })

    if (!user) {
      const orphanEntity = await prisma.entity.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, userId: true, firstName: true, lastName: true },
      })
      console.log('User: absent')
      console.log('Entity orpheline:', orphanEntity ?? 'aucune')
      continue
    }

    const effectivePlan = resolveEffectivePlan({
      subscription: user.subscription,
      email: user.email,
    })
    const trial = isPremiumTrialSubscription(user.subscription)
    const entity = user.entities[0]
    const cert = entity?.certificates[0]
    const badgeJwt = cert?.signatures.some((s) => Boolean(s.signature)) ?? false

    console.log('User:', user.id, '| kyc:', user.kycStatus, '| planId:', user.plan?.type ?? '—')
    console.log('Subscription:', user.subscription?.plan, user.subscription?.status, trial ? '(trial)' : '')
    console.log('Plan effectif:', effectivePlan)
    console.log(
      'Entity:',
      entity
        ? `${entity.id} · ${entity.firstName ?? ''} ${entity.lastName ?? ''} · ${entity.validationLevel}`
        : 'absente',
    )
    console.log(
      'Certificate:',
      cert ? `${cert.id} · ${cert.status} · ${cert.level} · chain ${cert.blockchainStatus}` : 'absent',
    )
    console.log('Badge JWT:', badgeJwt ? 'OK' : 'MANQUANT')
    console.log('Plan row limits:', {
      maxEntities: user.plan?.maxEntities,
      trustCircleEnabled: user.plan?.trustCircleEnabled,
      blockchainAnchor: user.plan?.blockchainAnchor,
    })
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
