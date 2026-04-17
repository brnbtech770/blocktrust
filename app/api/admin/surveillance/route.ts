// app/api/admin/surveillance/route.ts
// KPIs et série horaire pour le dashboard Surveillance IA
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

function startOfHour(d: Date): Date {
  const x = new Date(d)
  x.setMinutes(0, 0, 0)
  return x
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [verifications24h, fraudCount, unreadAlerts, runLogs] = await Promise.all([
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

  const recentFraudAlerts = await prisma.adminAlert.findMany({
    where: {
      type: {
        in: ['FRAUD_ALERT', 'SUSPICIOUS_VOLUME', 'SUSPICIOUS_SCANNING'],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return NextResponse.json({
    verifications24h,
    fraudRate,
    fraudCount,
    unreadAlerts,
    lastRunAt: lastRun?.createdAt?.toISOString() ?? null,
    lastRunMeta: lastRun?.newValue ?? null,
    chart,
    recentFraudAlerts: recentFraudAlerts.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      read: a.read,
      createdAt: a.createdAt.toISOString(),
    })),
  })
}
