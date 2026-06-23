// lib/agents/anomaly-detector.ts
// Agent de surveillance (MVP) — agrège les lignes Prisma `Verification`
// (équivalent métier des « VerificationEvent » du cahier des charges).
// ============================================================

import { prisma } from '@/app/lib/db'
import { createAdminAlert } from '@/lib/admin-alerts'
import {
  recordGracePeriodSkip,
  shouldSkipAlertForNewAccount,
} from '@/lib/alert-grace-period'
import { formatCertificateLabel } from '@/lib/format-certificate-label'
import type { Prisma } from '@prisma/client'

const AGENT_META = { source: 'anomaly-detector' } as const

type MetadataPathFilter = { path: string[]; equals: string }

async function recentAgentAlertExists(
  type: string,
  metadataMatch: MetadataPathFilter,
  since: Date
): Promise<boolean> {
  const found = await prisma.adminAlert.findFirst({
    where: {
      type,
      createdAt: { gte: since },
      metadata: metadataMatch,
    },
    select: { id: true },
  })
  return Boolean(found)
}

export type AnomalyDetectionResult = {
  highVolume: number
  fraudRate: number
  revokedScans: number
  graceSkipped: number
}

export async function runAnomalyDetection(): Promise<AnomalyDetectionResult> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let graceSkipped = 0

  // Règle 1 : volume anormal par certificat (> 50 vérifs / h)
  const highVolumeGroups = await prisma.verification.groupBy({
    by: ['certificateId'],
    where: {
      verifiedAt: { gte: oneHourAgo },
      certificateId: { not: null },
    },
    _count: { id: true },
    having: { id: { _count: { gt: 50 } } },
  })

  let highVolumeAlerts = 0
  for (const row of highVolumeGroups) {
    const certificateId = row.certificateId
    if (!certificateId) continue

    const dup = await recentAgentAlertExists(
      'SUSPICIOUS_VOLUME',
      {
        path: ['certificateId'],
        equals: certificateId,
      },
      oneHourAgo
    )
    if (dup) continue

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
            user: { select: { id: true, createdAt: true } },
          },
        },
      },
    })

    const owner = cert?.entity?.user
    const alertMeta = {
      ...AGENT_META,
      certificateId,
      count: row._count.id,
      window: '1h',
    }
    if (
      owner &&
      shouldSkipAlertForNewAccount(owner, 'SUSPICIOUS_VOLUME', {
        metadata: alertMeta,
        count: row._count.id,
      })
    ) {
      await recordGracePeriodSkip({
        userId: owner.id,
        alertType: 'SUSPICIOUS_VOLUME',
        rule: 'high_volume_1h',
      })
      graceSkipped += 1
      continue
    }

    const certLabel = formatCertificateLabel({
      id: certificateId,
      publicId: cert?.publicId,
      entity: cert?.entity,
    })

    await createAdminAlert({
      type: 'SUSPICIOUS_VOLUME',
      title: '⚠️ Volume anormal de vérifications',
      description: `${row._count.id} vérifications en 1h — ${certLabel.label}`,
      entityId: cert?.entityId ?? undefined,
      metadata: alertMeta,
    })
    highVolumeAlerts += 1
  }

  // Règle 2 : taux de FRAUD_ALERT élevé (> 10 % sur 24 h) — métrique globale, pas de filtre grâce
  const totalVerifs = await prisma.verification.count({
    where: { verifiedAt: { gte: oneDayAgo } },
  })
  const fraudVerifs = await prisma.verification.count({
    where: {
      verifiedAt: { gte: oneDayAgo },
      result: 'FRAUD_ALERT',
    },
  })

  const fraudRate = totalVerifs > 0 ? fraudVerifs / totalVerifs : 0

  if (totalVerifs > 0 && fraudRate > 0.1) {
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)
    const dupGlobal = await recentAgentAlertExists(
      'FRAUD_ALERT',
      { path: ['rule'], equals: 'fraud_rate_24h' },
      twelveHoursAgo
    )
    if (!dupGlobal) {
      await createAdminAlert({
        type: 'FRAUD_ALERT',
        title: '🚨 Taux de fraude anormal',
        description: `${fraudVerifs}/${totalVerifs} vérifications en FRAUD_ALERT sur les dernières 24h`,
        metadata: {
          ...AGENT_META,
          rule: 'fraud_rate_24h',
          fraudRate: fraudRate.toFixed(4),
          fraudVerifs,
          totalVerifs,
        },
      })
    }
  }

  // Règle 3 : certificat révoqué encore scanné — fraude avérée, jamais filtrée
  const revokedHits = await prisma.verification.findMany({
    where: {
      verifiedAt: { gte: oneHourAgo },
      certificateId: { not: null },
      certificate: { status: 'REVOKED' },
    },
    select: {
      certificateId: true,
      result: true,
    },
  })

  const revokedCertIds = [
    ...new Set(
      revokedHits
        .map((h) => h.certificateId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]

  let revokedScanAlerts = 0
  const firstHitByCert = new Map<string, (typeof revokedHits)[number]>()
  for (const h of revokedHits) {
    if (h.certificateId && !firstHitByCert.has(h.certificateId)) {
      firstHitByCert.set(h.certificateId, h)
    }
  }

  for (const cid of revokedCertIds) {
    const dupCert = await prisma.adminAlert.findFirst({
      where: {
        type: 'FRAUD_ALERT',
        createdAt: { gte: oneHourAgo },
        AND: [
          { metadata: { path: ['rule'], equals: 'revoked_still_scanned' } },
          { metadata: { path: ['certificateId'], equals: cid } },
        ],
      },
      select: { id: true },
    })
    if (dupCert) continue

    const hit = firstHitByCert.get(cid)
    const cert = await prisma.certificate.findUnique({
      where: { id: cid },
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
      id: cid,
      publicId: cert?.publicId,
      entity: cert?.entity,
    })

    await createAdminAlert({
      type: 'FRAUD_ALERT',
      title: '🚨 Certificat révoqué toujours utilisé',
      description: `Certificat révoqué encore scanné — ${certLabel.label}`,
      entityId: cert?.entityId ?? undefined,
      metadata: {
        ...AGENT_META,
        rule: 'revoked_still_scanned',
        certificateId: cid,
        sampleResult: hit?.result,
      },
    })
    revokedScanAlerts += 1
  }

  await prisma.auditLog.create({
    data: {
      action: 'ANOMALY_DETECTOR_RUN',
      resource: 'agent',
      resourceId: 'anomaly-detector',
      newValue: {
        finishedAt: new Date().toISOString(),
        highVolumeGroups: highVolumeGroups.length,
        highVolumeAlertsCreated: highVolumeAlerts,
        fraudRate,
        revokedCertsDetected: revokedCertIds.length,
        revokedAlertsCreated: revokedScanAlerts,
        totalVerifs24h: totalVerifs,
        fraudVerifs24h: fraudVerifs,
        graceSkipped,
      } as Prisma.InputJsonValue,
    },
  })

  return {
    highVolume: highVolumeGroups.length,
    fraudRate,
    revokedScans: revokedCertIds.length,
    graceSkipped,
  }
}
