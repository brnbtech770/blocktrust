// lib/agents/subscription-monitor.ts
// Agent Abonnements — rappels expiration, avertissement J-7, cache MRR
// ============================================================

import * as React from 'react'
import { prisma } from '@/app/lib/db'
import { sendEmailFireAndForget } from '@/lib/email'
import { monthlyRevenueForSubscription } from '@/lib/admin-revenue'
import { appBaseUrl, recentAuditLogExists, writeAgentAuditLog } from '@/lib/agents/agent-utils'
import { runPremiumTrialExpiry } from '@/lib/premium-trial'
import { Body, Button, Html, Text } from '@react-email/components'

const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

function SubscriptionExpiryEmail({
  userName,
  plan,
  expiresAt,
  renewUrl,
  variant,
}: {
  userName: string
  plan: string
  expiresAt: string
  renewUrl: string
  variant: 'expired' | 'warning'
}) {
  const title =
    variant === 'expired'
      ? 'Votre abonnement BLOCKTRUST™ a expiré'
      : 'Votre abonnement BLOCKTRUST™ expire bientôt'
  return React.createElement(
    Html,
    null,
    React.createElement(
      Body,
      { style: { fontFamily: 'Inter, sans-serif', padding: 24 } },
      React.createElement(Text, { style: { fontSize: 18, fontWeight: 600 } }, title),
      React.createElement(
        Text,
        { style: { fontSize: 14 } },
        `Bonjour ${userName}, votre plan ${plan} ${variant === 'expired' ? 'a expiré le' : 'expire le'} ${expiresAt}.`,
      ),
      React.createElement(
        Button,
        { href: renewUrl, style: { background: '#00d4ff', color: '#0a1628', padding: '12px 20px' } },
        'Gérer mon abonnement',
      ),
    ),
  )
}

export type SubscriptionMonitorResult = {
  expiredRemindersSent: number
  warningRemindersSent: number
  premiumTrialsDowngraded: number
  premiumTrialExpiryEmailsSent: number
  mrrEur: number
  activeSubscriptions: number
}

export async function runSubscriptionMonitor(): Promise<SubscriptionMonitorResult> {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const reminderCooldown = new Date(now.getTime() - REMINDER_COOLDOWN_MS)
  const base = appBaseUrl()
  const renewUrl = `${base}/dashboard/settings/billing`

  let expiredRemindersSent = 0
  let warningRemindersSent = 0

  const recentlyExpired = await prisma.subscription.findMany({
    where: {
      currentPeriodEnd: { gte: twentyFourHoursAgo, lt: now },
      status: { not: 'active' },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    take: 50,
  })

  for (const sub of recentlyExpired) {
    const email = sub.user.email
    if (!email) continue
    const alreadySent = await recentAuditLogExists(
      'SUBSCRIPTION_EXPIRED_REMINDER',
      sub.id,
      reminderCooldown,
    )
    if (alreadySent) continue

    const expiresLabel = sub.currentPeriodEnd?.toLocaleDateString('fr-FR') ?? 'récemment'
    sendEmailFireAndForget({
      to: email,
      subject: 'Rappel — abonnement BLOCKTRUST™ expiré',
      react: React.createElement(SubscriptionExpiryEmail, {
        userName: sub.user.name ?? 'Utilisateur',
        plan: sub.plan,
        expiresAt: expiresLabel,
        renewUrl,
        variant: 'expired',
      }),
    })

    await prisma.auditLog
      .create({
        data: {
          action: 'SUBSCRIPTION_EXPIRED_REMINDER',
          resource: 'subscription',
          resourceId: sub.id,
          userId: sub.userId,
        },
      })
      .catch(() => null)
    expiredRemindersSent += 1
  }

  const expiringSoon = await prisma.subscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { gte: now, lte: sevenDaysAhead },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    take: 50,
  })

  for (const sub of expiringSoon) {
    const email = sub.user.email
    if (!email || !sub.currentPeriodEnd) continue
    const alreadySent = await recentAuditLogExists(
      'SUBSCRIPTION_EXPIRY_WARNING',
      sub.id,
      reminderCooldown,
    )
    if (alreadySent) continue

    sendEmailFireAndForget({
      to: email,
      subject: 'Avertissement — abonnement BLOCKTRUST™ expire dans 7 jours',
      react: React.createElement(SubscriptionExpiryEmail, {
        userName: sub.user.name ?? 'Utilisateur',
        plan: sub.plan,
        expiresAt: sub.currentPeriodEnd.toLocaleDateString('fr-FR'),
        renewUrl,
        variant: 'warning',
      }),
    })

    await prisma.auditLog
      .create({
        data: {
          action: 'SUBSCRIPTION_EXPIRY_WARNING',
          resource: 'subscription',
          resourceId: sub.id,
          userId: sub.userId,
        },
      })
      .catch(() => null)
    warningRemindersSent += 1
  }

  const premiumTrialResult = await runPremiumTrialExpiry()

  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'active' },
    select: { id: true, plan: true, stripePriceId: true },
  })

  let mrrEur = 0
  for (const sub of activeSubs) {
    mrrEur += monthlyRevenueForSubscription(sub.plan, sub.stripePriceId)
  }
  mrrEur = Math.round(mrrEur * 100) / 100

  await writeAgentAuditLog('SUBSCRIPTION_MONITOR_RUN', 'subscription-monitor', {
    expiredRemindersSent,
    warningRemindersSent,
    premiumTrialsDowngraded: premiumTrialResult.downgraded,
    premiumTrialExpiryEmailsSent: premiumTrialResult.emailsSent,
    mrrEur,
    activeSubscriptions: activeSubs.length,
  })

  await prisma.auditLog
    .create({
      data: {
        action: 'SUBSCRIPTION_MRR_CACHE',
        resource: 'agent',
        resourceId: 'subscription-monitor',
        newValue: { mrrEur, activeSubscriptions: activeSubs.length, cachedAt: now.toISOString() },
      },
    })
    .catch(() => null)

  return {
    expiredRemindersSent,
    warningRemindersSent,
    premiumTrialsDowngraded: premiumTrialResult.downgraded,
    premiumTrialExpiryEmailsSent: premiumTrialResult.emailsSent,
    mrrEur,
    activeSubscriptions: activeSubs.length,
  }
}
