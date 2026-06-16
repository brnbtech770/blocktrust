// app/api/admin/surveillance/route.ts
// KPIs et série horaire pour le dashboard Surveillance IA
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import {
  entityDisplayNameFromEntity,
  formatCertificateLabel,
  formatUserLabel,
} from '@/lib/format-certificate-label'

export const dynamic = 'force-dynamic'

function startOfHour(d: Date): Date {
  const x = new Date(d)
  x.setMinutes(0, 0, 0)
  return x
}

function readAuditMetric(
  newValue: unknown,
  key: string,
): number | null {
  if (!newValue || typeof newValue !== 'object' || Array.isArray(newValue)) return null
  const v = (newValue as Record<string, unknown>)[key]
  return typeof v === 'number' ? v : null
}

const AGENT_RUN_ACTIONS = [
  'FRAUD_SURVEILLANCE_RUN',
  'SECURITY_MONITOR_RUN',
  'SUBSCRIPTION_MONITOR_RUN',
  'ONBOARDING_MONITOR_RUN',
] as const

async function getLatestAgentRun(action: string, resourceId: string) {
  return prisma.auditLog.findFirst({
    where: { action, resource: 'agent', resourceId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, newValue: true },
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [
    verifications24h,
    fraudCount,
    unreadAlerts,
    runLogs,
    polygonAnchored,
    polygonPending,
    polygonFailed,
    fraudRun,
    securityRun,
    subscriptionRun,
    onboardingRun,
    mrrCache,
    securityAlerts24h,
    agentExecutionLogs,
  ] = await Promise.all([
    prisma.verification.count({
      where: { verifiedAt: { gte: oneDayAgo } },
    }),
    prisma.verification.count({
      where: {
        verifiedAt: { gte: oneDayAgo },
        result: 'FRAUD_ALERT',
      },
    }),
    prisma.adminAlert.count({ where: { read: false } }),
    prisma.auditLog.findMany({
      where: {
        action: 'ANOMALY_DETECTOR_RUN',
        resource: 'agent',
        resourceId: 'anomaly-detector',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { createdAt: true, newValue: true },
    }),
    prisma.certificate.count({ where: { blockchainStatus: 'ANCHORED' } }),
    prisma.certificate.count({ where: { blockchainStatus: 'PENDING', status: 'ACTIVE' } }),
    prisma.certificate.count({ where: { blockchainStatus: 'FAILED' } }),
    getLatestAgentRun('FRAUD_SURVEILLANCE_RUN', 'fraud-surveillance'),
    getLatestAgentRun('SECURITY_MONITOR_RUN', 'security-monitor'),
    getLatestAgentRun('SUBSCRIPTION_MONITOR_RUN', 'subscription-monitor'),
    getLatestAgentRun('ONBOARDING_MONITOR_RUN', 'onboarding-monitor'),
    prisma.auditLog.findFirst({
      where: { action: 'SUBSCRIPTION_MRR_CACHE', resourceId: 'subscription-monitor' },
      orderBy: { createdAt: 'desc' },
      select: { newValue: true, createdAt: true },
    }),
    prisma.adminAlert.count({
      where: {
        type: 'SECURITY',
        createdAt: { gte: oneDayAgo },
      },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: [...AGENT_RUN_ACTIONS] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        action: true,
        createdAt: true,
        resourceId: true,
        newValue: true,
      },
    }),
  ])

  const fraudRate = verifications24h > 0 ? fraudCount / verifications24h : 0

  const lastRun =
    runLogs.find((row) => {
      const v = row.newValue
      return Boolean(
        v && typeof v === 'object' && !Array.isArray(v) && 'finishedAt' in (v as object)
      )
    }) ?? null

  const verifications = await prisma.verification.findMany({
    where: { verifiedAt: { gte: oneDayAgo } },
    select: { verifiedAt: true },
  })

  const bucketMs = 60 * 60 * 1000
  const buckets = new Map<number, number>()
  for (let i = 0; i < 24; i++) {
    const t = startOfHour(new Date(now.getTime() - (23 - i) * bucketMs)).getTime()
    buckets.set(t, 0)
  }
  for (const v of verifications) {
    const t = startOfHour(v.verifiedAt).getTime()
    if (buckets.has(t)) {
      buckets.set(t, (buckets.get(t) ?? 0) + 1)
    }
  }

  const chart = [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, count]) => ({
      hour: new Date(ts).toLocaleString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
      }),
      count,
    }))

  const recentFraudAlertsRaw = await prisma.adminAlert.findMany({
    where: {
      type: {
        in: ['FRAUD_ALERT', 'SUSPICIOUS_VOLUME', 'SUSPICIOUS_SCANNING'],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const entityIds = [
    ...new Set(
      recentFraudAlertsRaw
        .map((a) => a.entityId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const certIds = [
    ...new Set(
      recentFraudAlertsRaw
        .map((a) => {
          if (!a.metadata || typeof a.metadata !== 'object' || Array.isArray(a.metadata)) {
            return null
          }
          const cid = (a.metadata as Record<string, unknown>).certificateId
          return typeof cid === 'string' ? cid : null
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const userIds = [
    ...new Set(
      recentFraudAlertsRaw
        .map((a) => a.userId)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const [entities, certs, users] = await Promise.all([
    entityIds.length
      ? prisma.entity.findMany({
          where: { id: { in: entityIds } },
          select: {
            id: true,
            entityType: true,
            firstName: true,
            lastName: true,
            legalName: true,
            tradeName: true,
            email: true,
          },
        })
      : Promise.resolve([]),
    certIds.length
      ? prisma.certificate.findMany({
          where: { id: { in: certIds } },
          select: {
            id: true,
            publicId: true,
            entity: {
              select: {
                entityType: true,
                firstName: true,
                lastName: true,
                legalName: true,
                tradeName: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ])

  const entityMap = new Map(entities.map((e) => [e.id, e]))
  const certMap = new Map(certs.map((c) => [c.id, c]))
  const userMap = new Map(users.map((u) => [u.id, u]))

  const recentFraudAlerts = recentFraudAlertsRaw.map((a) => {
    const entity = a.entityId ? entityMap.get(a.entityId) : undefined
    const metaCertId =
      a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata)
        ? (a.metadata as Record<string, unknown>).certificateId
        : null
    const cert =
      typeof metaCertId === 'string' ? certMap.get(metaCertId) : undefined
    const user = a.userId ? userMap.get(a.userId) : undefined
    const contactLabel =
      (cert
        ? formatCertificateLabel({
            id: cert.id,
            publicId: cert.publicId,
            entity: cert.entity,
          }).label
        : null) ??
      (entity ? entityDisplayNameFromEntity(entity) : null) ??
      (user ? formatUserLabel(user) : null)

    return {
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      contactLabel,
      read: a.read,
      createdAt: a.createdAt.toISOString(),
    }
  })

  const fraudAlertsGenerated =
    (readAuditMetric(fraudRun?.newValue, 'fraudAlertsCreated') ?? 0) +
    (readAuditMetric(fraudRun?.newValue, 'lowTrustAlerts') ?? 0) +
    (readAuditMetric(fraudRun?.newValue, 'failedClusterAlerts') ?? 0) +
    (readAuditMetric(fraudRun?.newValue, 'ipClusterAlerts') ?? 0)

  const onboardingReminders =
    (readAuditMetric(onboardingRun?.newValue, 'kycRemindersSent') ?? 0) +
    (readAuditMetric(onboardingRun?.newValue, 'activationRemindersSent') ?? 0)

  const mrrEur =
    readAuditMetric(mrrCache?.newValue, 'mrrEur') ??
    readAuditMetric(subscriptionRun?.newValue, 'mrrEur') ??
    0

  return NextResponse.json({
    verifications24h,
    fraudRate,
    fraudCount,
    unreadAlerts,
    lastRunAt: lastRun?.createdAt?.toISOString() ?? null,
    lastRunMeta: lastRun?.newValue ?? null,
    chart,
    polygon: {
      anchored: polygonAnchored,
      pending: polygonPending,
      failed: polygonFailed,
    },
    recentFraudAlerts: recentFraudAlerts.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      contactLabel: a.contactLabel,
      read: a.read,
      createdAt: a.createdAt,
    })),
    agents: {
      fraud: {
        active: true,
        lastRunAt: fraudRun?.createdAt?.toISOString() ?? null,
        alertsGenerated: fraudAlertsGenerated,
      },
      security: {
        active: true,
        lastRunAt: securityRun?.createdAt?.toISOString() ?? null,
        alertsGenerated: securityAlerts24h,
      },
      subscription: {
        active: true,
        lastRunAt: subscriptionRun?.createdAt?.toISOString() ?? mrrCache?.createdAt?.toISOString() ?? null,
        mrrEur,
      },
      onboarding: {
        active: true,
        lastRunAt: onboardingRun?.createdAt?.toISOString() ?? null,
        remindersSent: onboardingReminders,
      },
    },
    agentExecutionLogs: agentExecutionLogs.map((log) => ({
      id: log.id,
      action: log.action,
      resourceId: log.resourceId,
      createdAt: log.createdAt.toISOString(),
      meta: log.newValue,
    })),
  })
}
