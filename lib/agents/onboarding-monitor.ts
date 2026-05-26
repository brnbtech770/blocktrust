// lib/agents/onboarding-monitor.ts
// Agent Onboarding — rappels KYC, ancrage Polygon stale, activation compte
// ============================================================

import * as React from 'react'
import { prisma } from '@/app/lib/db'
import { sendEmailFireAndForget } from '@/lib/email'
import { KYCRetryEmail, subject as kycRetrySubject } from '@/emails/KYCRetryEmail'
import { WelcomeEmail } from '@/emails/WelcomeEmail'
import {
  appBaseUrl,
  recentAuditLogExists,
  writeAgentAuditLog,
} from '@/lib/agents/agent-utils'
import { retryStalePendingAnchors } from '@/lib/polygon'

export type OnboardingMonitorResult = {
  kycRemindersSent: number
  anchorRetries: { examined: number; anchored: number; failed: number }
  activationRemindersSent: number
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
    select: { id: true, email: true, name: true },
    take: 50,
  })

  for (const user of unverifiedUsers) {
    if (!user.email) continue
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

    sendEmailFireAndForget({
      to: user.email,
      subject: 'Activez votre compte BLOCKTRUST™',
      react: React.createElement(WelcomeEmail, {
        userName: user.name,
        dashboardUrl: `${base}/dashboard`,
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

  await writeAgentAuditLog('ONBOARDING_MONITOR_RUN', 'onboarding-monitor', {
    kycRemindersSent,
    anchorRetries,
    activationRemindersSent,
  })

  return {
    kycRemindersSent,
    anchorRetries: {
      examined: anchorRetries.examined,
      anchored: anchorRetries.anchored,
      failed: anchorRetries.failed,
    },
    activationRemindersSent,
  }
}
