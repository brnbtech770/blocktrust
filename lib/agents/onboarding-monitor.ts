// lib/agents/onboarding-monitor.ts
// Agent Onboarding — rappels KYC, ancrage Polygon stale, activation compte
// ============================================================

import * as React from 'react'
import { prisma } from '@/app/lib/db'
import { sendEmail, sendEmailFireAndForget } from '@/lib/email'
import { KYCRetryEmail, subject as kycRetrySubject } from '@/emails/KYCRetryEmail'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import {
  getLatestUserBadgeVerifyUrl,
  resolveWelcomeFirstName,
  WELCOME_EMAIL_FROM,
} from '@/lib/welcome-email'
import {
  DiscoveryReminderJ7,
  subject as discoveryJ7Subject,
} from '@/emails/DiscoveryReminderJ7'
import {
  DiscoveryReminderJ2,
  subject as discoveryJ2Subject,
} from '@/emails/DiscoveryReminderJ2'
import {
  DiscoveryExpired,
  subject as discoveryExpiredSubject,
} from '@/emails/DiscoveryExpired'
import {
  appBaseUrl,
  recentAuditLogExists,
  writeAgentAuditLog,
} from '@/lib/agents/agent-utils'
import { shouldSendKycReminder } from '@/lib/alert-grace-period'
import { isAdmin } from '@/lib/admin-utils'
import { DISCOVERY_DURATION_DAYS, DISCOVERY_EXPIRED_PLAN, resolveEffectivePlan } from '@/lib/plan-features'
import { retryStalePendingAnchors } from '@/lib/polygon'

export type DiscoveryLifecycleResult = {
  remindersJ7: number
  remindersJ2: number
  expired: number
}

export type OnboardingMonitorResult = {
  kycRemindersSent: number
  anchorRetries: { examined: number; anchored: number; failed: number }
  activationRemindersSent: number
  discovery: DiscoveryLifecycleResult
}

const DAY_MS = 24 * 60 * 60 * 1000
/** Anti-doublon « une seule fois » : la trace audit doit ne jamais avoir existé. */
const SINCE_EVER = new Date(0)

/**
 * Date d'activation du système Découverte 30 jours.
 * Grandfathering : les comptes créés AVANT cette date ne sont jamais expirés
 * automatiquement (early adopters, comptes de test/internes jamais informés de la règle).
 * Ajustable ici si besoin.
 */
const DATE_LANCEMENT_DECOUVERTE = new Date('2026-06-01T00:00:00Z')

/**
 * Cycle de vie du plan Découverte (gratuit, 30 jours) — géré par l'agent onboarding.
 * Pour chaque compte B2C sans abonnement (≠ admin, ≠ payant) :
 *   J-7 (jour 23) → email rappel ; J-2 (jour 28) → email rappel ;
 *   J30+ → bascule en DISCOVERY_EXPIRED (lecture seule) + email « période terminée ».
 * Fail-soft : chaque opération est isolée (catch) et n'interrompt jamais l'agent.
 */
async function processDiscoveryLifecycle(
  now: Date,
  base: string,
): Promise<DiscoveryLifecycleResult> {
  const result: DiscoveryLifecycleResult = { remindersJ7: 0, remindersJ2: 0, expired: 0 }
  const pricingUrl = `${base}/pricing`
  // On ne traite que les comptes d'au moins 23 jours (seuil du 1er rappel J-7).
  const minAgeThreshold = new Date(now.getTime() - 23 * DAY_MS)

  const discoveryUsers = await prisma.user
    .findMany({
      where: {
        subscription: { is: null }, // ni payant, ni déjà expiré
        email: { not: null },
        // Au moins 23 jours, mais seulement les comptes nés APRÈS le lancement
        // (grandfathering des comptes pré-lancement jamais informés de la règle).
        createdAt: { gte: DATE_LANCEMENT_DECOUVERTE, lt: minAgeThreshold },
      },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' }, // les plus anciens (à expirer) d'abord
      take: 100,
    })
    .catch(() => [])

  for (const user of discoveryUsers) {
    if (!user.email || isAdmin(user.email)) continue
    const ageDays = Math.floor((now.getTime() - user.createdAt.getTime()) / DAY_MS)

    try {
      if (ageDays >= DISCOVERY_DURATION_DAYS) {
        const already = await recentAuditLogExists(
          'ONBOARDING_DISCOVERY_EXPIRED',
          user.id,
          SINCE_EVER,
        )
        if (already) continue

        await prisma.subscription
          .upsert({
            where: { userId: user.id },
            create: { userId: user.id, plan: DISCOVERY_EXPIRED_PLAN, status: 'inactive' },
            update: { plan: DISCOVERY_EXPIRED_PLAN, status: 'inactive' },
          })
          .catch(() => null)

        await sendEmail({
          to: user.email,
          subject: discoveryExpiredSubject,
          react: React.createElement(DiscoveryExpired, {
            userName: user.name,
            pricingUrl,
          }),
        }).catch(() => null)

        await prisma.auditLog
          .create({
            data: {
              action: 'ONBOARDING_DISCOVERY_EXPIRED',
              resource: 'user',
              resourceId: user.id,
              userId: user.id,
            },
          })
          .catch(() => null)
        result.expired += 1
      } else if (ageDays >= DISCOVERY_DURATION_DAYS - 2) {
        const already = await recentAuditLogExists(
          'ONBOARDING_DISCOVERY_J2',
          user.id,
          SINCE_EVER,
        )
        if (already) continue

        await sendEmail({
          to: user.email,
          subject: discoveryJ2Subject,
          react: React.createElement(DiscoveryReminderJ2, {
            userName: user.name,
            pricingUrl,
          }),
        }).catch(() => null)

        await prisma.auditLog
          .create({
            data: {
              action: 'ONBOARDING_DISCOVERY_J2',
              resource: 'user',
              resourceId: user.id,
              userId: user.id,
            },
          })
          .catch(() => null)
        result.remindersJ2 += 1
      } else {
        // ageDays compris entre 23 et 27 → rappel J-7
        const already = await recentAuditLogExists(
          'ONBOARDING_DISCOVERY_J7',
          user.id,
          SINCE_EVER,
        )
        if (already) continue

        await sendEmail({
          to: user.email,
          subject: discoveryJ7Subject,
          react: React.createElement(DiscoveryReminderJ7, {
            userName: user.name,
            pricingUrl,
          }),
        }).catch(() => null)

        await prisma.auditLog
          .create({
            data: {
              action: 'ONBOARDING_DISCOVERY_J7',
              resource: 'user',
              resourceId: user.id,
              userId: user.id,
            },
          })
          .catch(() => null)
        result.remindersJ7 += 1
      }
    } catch (err) {
      console.error('[onboarding-monitor] discovery lifecycle error', err)
    }
  }

  return result
}

export async function runOnboardingMonitor(): Promise<OnboardingMonitorResult> {
  const now = new Date()
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const reminderCooldown = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const base = appBaseUrl()

  let kycRemindersSent = 0
  let activationRemindersSent = 0

  const unverifiedUsers = await prisma.user.findMany({
    where: {
      kycStatus: 'PENDING',
      createdAt: { lt: fortyEightHoursAgo },
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      subscription: { select: { plan: true, status: true } },
    },
    take: 50,
  })

  for (const user of unverifiedUsers) {
    if (!user.email) continue
    const plan = resolveEffectivePlan({ subscription: user.subscription, email: user.email })
    if (!shouldSendKycReminder(plan)) continue
    const alreadyReminded = await recentAuditLogExists(
      'ONBOARDING_KYC_REMINDER',
      user.id,
      reminderCooldown,
    )
    if (alreadyReminded) continue

    sendEmailFireAndForget({
      to: user.email,
      subject: kycRetrySubject,
      react: React.createElement(KYCRetryEmail, {
        userName: user.name ?? 'Utilisateur',
        verificationUrl: `${base}/onboarding/verify`,
      }),
    })

    await prisma.auditLog
      .create({
        data: {
          action: 'ONBOARDING_KYC_REMINDER',
          resource: 'user',
          resourceId: user.id,
          userId: user.id,
        },
      })
      .catch(() => null)
    kycRemindersSent += 1
  }

  const anchorRetries = await retryStalePendingAnchors(25, 60 * 60 * 1000).catch(() => ({
    skipped: true,
    examined: 0,
    anchored: 0,
    failed: 0,
    noHash: 0,
  }))

  const inactiveUsers = await prisma.user.findMany({
    where: {
      createdAt: { lt: sevenDaysAgo },
      email: { not: null },
      entities: { none: {} },
    },
    select: { id: true, email: true, name: true },
    take: 50,
  })

  for (const user of inactiveUsers) {
    if (!user.email) continue
    const alreadyReminded = await recentAuditLogExists(
      'ONBOARDING_ACTIVATION_REMINDER',
      user.id,
      reminderCooldown,
    )
    if (alreadyReminded) continue

    const badgeVerifyUrl = await getLatestUserBadgeVerifyUrl(user.id)

    sendEmailFireAndForget({
      to: user.email,
      from: WELCOME_EMAIL_FROM,
      replyTo: 'contact@blocktrust.tech',
      subject: 'Activez votre compte BLOCKTRUST™',
      react: React.createElement(WelcomeEmail, {
        firstName: resolveWelcomeFirstName(user.name, user.email),
        dashboardUrl: `${base}/dashboard`,
        badgeVerifyUrl,
      }),
    })

    await prisma.auditLog
      .create({
        data: {
          action: 'ONBOARDING_ACTIVATION_REMINDER',
          resource: 'user',
          resourceId: user.id,
          userId: user.id,
        },
      })
      .catch(() => null)
    activationRemindersSent += 1
  }

  const discovery = await processDiscoveryLifecycle(now, base).catch(() => ({
    remindersJ7: 0,
    remindersJ2: 0,
    expired: 0,
  }))

  await writeAgentAuditLog('ONBOARDING_MONITOR_RUN', 'onboarding-monitor', {
    kycRemindersSent,
    anchorRetries,
    activationRemindersSent,
    discovery,
  })

  return {
    kycRemindersSent,
    anchorRetries: {
      examined: anchorRetries.examined,
      anchored: anchorRetries.anchored,
      failed: anchorRetries.failed,
    },
    activationRemindersSent,
    discovery,
  }
}
