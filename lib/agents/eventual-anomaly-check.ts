// lib/agents/eventual-anomaly-check.ts
// Contrôles légers événementiels après chaque vérification (Option C).
// ============================================================

import { prisma } from '@/app/lib/db'
import { createAdminAlert } from '@/lib/admin-alerts'
import { formatCertificateLabel } from '@/lib/format-certificate-label'

const EVENT_SOURCE = 'eventual-anomaly-check' as const

async function recentRealtimeAlert(rule: string, certificateId: string, since: Date): Promise<boolean> {
  const found = await prisma.adminAlert.findFirst({
    where: {
      createdAt: { gte: since },
      AND: [
        { metadata: { path: ['rule'], equals: rule } },
        { metadata: { path: ['certificateId'], equals: certificateId } },
      ],
    },
    select: { id: true },
  })
  return Boolean(found)
}

export async function runEventualAnomalyCheck(certificateId: string, userId?: string) {
  const oneHourAgo = new Date(Date.now() - 3600_000)
  const dedupSince = new Date(Date.now() - 45 * 60_000)

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      entityId: true,
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
  const certLabel = formatCertificateLabel({
    id: certificateId,
    publicId: cert?.publicId,
    entity: cert?.entity,
  })

  const recentVerifs = await prisma.verification.count({
    where: {
      certificateId,
      verifiedAt: { gte: oneHourAgo },
    },
  })

  if (recentVerifs > 20) {
    const dup = await recentRealtimeAlert('realtime_volume_check', certificateId, dedupSince)
    if (!dup) {
      await createAdminAlert({
        type: 'SUSPICIOUS_VOLUME',
        title: `Volume suspect — ${recentVerifs} scans/heure`,
        description: `${certLabel.label} — ${recentVerifs} scans dans la dernière heure.`,
        entityId: cert?.entityId ?? undefined,
        userId: userId ?? undefined,
        metadata: {
          source: EVENT_SOURCE,
          severity: recentVerifs > 50 ? 'HIGH' : 'MEDIUM',
          certificateId,
          count: recentVerifs,
          rule: 'realtime_volume_check',
        },
      })
    }
  }

  const ipGroups = await prisma.verification.groupBy({
    by: ['ipHash'],
    where: {
      certificateId,
      verifiedAt: { gte: oneHourAgo },
      ipHash: { not: null },
    },
    _count: { _all: true },
  })
  const distinctIpCount = ipGroups.length

  if (distinctIpCount > 10) {
    const dupIp = await recentRealtimeAlert('realtime_ip_diversity', certificateId, dedupSince)
    if (!dupIp) {
      await createAdminAlert({
        type: 'SUSPICIOUS_SCANNING',
        title: `IPs multiples — ${distinctIpCount} sources`,
        description: `${certLabel.label} — scanné depuis ${distinctIpCount} adresses IP distinctes en 1h (scan automatisé possible).`,
        entityId: cert?.entityId ?? undefined,
        userId: userId ?? undefined,
        metadata: {
          source: EVENT_SOURCE,
          severity: 'HIGH',
          certificateId,
          distinctIpCount,
          rule: 'realtime_ip_diversity',
        },
      })
    }
  }

  const recentFrauds = await prisma.verification.count({
    where: {
      certificateId,
      result: 'FRAUD_ALERT',
      verifiedAt: { gte: oneHourAgo },
    },
  })

  if (recentFrauds > 0) {
    const dupFraud = await recentRealtimeAlert('realtime_fraud_detection', certificateId, dedupSince)
    if (!dupFraud) {
      await createAdminAlert({
        type: 'FRAUD_ALERT',
        title: '🚨 Fraude détectée en temps réel',
        description: `${recentFrauds} tentative(s) de fraude — ${certLabel.label} (dernière heure).`,
        entityId: cert?.entityId ?? undefined,
        userId: userId ?? undefined,
        metadata: {
          source: EVENT_SOURCE,
          severity: 'CRITICAL',
          certificateId,
          fraudCount: recentFrauds,
          rule: 'realtime_fraud_detection',
        },
      })
    }
  }
}
