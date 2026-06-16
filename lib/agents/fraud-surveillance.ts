// lib/agents/fraud-surveillance.ts
// Agent Fraude — FRAUD_ALERT, TrustScore bas, clusters de vérifs suspectes
// ============================================================

import { prisma } from '@/app/lib/db'
import {
  createFraudAdminAlert,
  recentAgentAlertExists,
  writeAgentAuditLog,
} from '@/lib/agents/agent-utils'
import {
  formatCertificateLabel,
  formatUserLabel,
} from '@/lib/format-certificate-label'

const AGENT_META = { source: 'fraud-surveillance' } as const

export type FraudSurveillanceResult = {
  fraudAlertsCreated: number
  lowTrustAlerts: number
  failedClusterAlerts: number
  ipClusterAlerts: number
}

export async function runFraudSurveillance(): Promise<FraudSurveillanceResult> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let fraudAlertsCreated = 0
  let lowTrustAlerts = 0
  let failedClusterAlerts = 0
  let ipClusterAlerts = 0

  // FRAUD_ALERT récentes (< 1h) non traitées en alerte admin
  const recentFraudVerifs = await prisma.verification.findMany({
    where: {
      result: 'FRAUD_ALERT',
      verifiedAt: { gte: oneHourAgo },
      certificateId: { not: null },
    },
    select: {
      id: true,
      certificateId: true,
      verifiedAt: true,
      certificate: {
        select: {
          entityId: true,
          publicId: true,
          entity: { select: { userId: true, legalName: true, tradeName: true, firstName: true, lastName: true } },
        },
      },
    },
    take: 50,
  })

  for (const v of recentFraudVerifs) {
    if (!v.certificateId) continue
    const dup = await recentAgentAlertExists(
      'FRAUD_ALERT',
      { path: ['verificationId'], equals: v.id },
      oneHourAgo,
    )
    if (dup) continue

    const entity = v.certificate?.entity
    const certLabel = formatCertificateLabel({
      id: v.certificateId,
      publicId: v.certificate?.publicId,
      entity: entity ?? undefined,
    })
    await createFraudAdminAlert({
      title: 'Alerte fraude détectée',
      description: `FRAUD_ALERT — ${certLabel.label}`,
      entityId: v.certificate?.entityId ?? undefined,
      userId: v.certificate?.entity?.userId,
      decrementTrustScoreUserId: v.certificate?.entity?.userId,
      metadata: {
        ...AGENT_META,
        rule: 'fraud_alert_verification',
        verificationId: v.id,
        certificateId: v.certificateId,
      },
    })
    fraudAlertsCreated += 1
  }

  // TrustScore < 30 non alerté (24h)
  const lowTrustUsers = await prisma.user.findMany({
    where: {
      trustScore: { lt: 30 },
      kycStatus: { not: 'REJECTED' },
    },
    select: { id: true, trustScore: true, email: true },
    take: 30,
  })

  for (const user of lowTrustUsers) {
    const dup = await recentAgentAlertExists(
      'FRAUD_ALERT',
      { path: ['userId'], equals: user.id },
      oneDayAgo,
    )
    if (dup) continue

    await createFraudAdminAlert({
      title: 'Alerte fraude détectée',
      description: `TrustScore critique (${user.trustScore}) — ${formatUserLabel(user)}`,
      userId: user.id,
      decrementTrustScoreUserId: user.id,
      metadata: {
        ...AGENT_META,
        rule: 'low_trust_score',
        userId: user.id,
        trustScore: user.trustScore,
      },
    })
    lowTrustAlerts += 1
  }

  // 3+ vérifications non VALID sur un même certificat en 1h
  const failedGroups = await prisma.verification.groupBy({
    by: ['certificateId'],
    where: {
      verifiedAt: { gte: oneHourAgo },
      certificateId: { not: null },
      result: { not: 'VALID' },
    },
    _count: { id: true },
    having: { id: { _count: { gte: 3 } } },
  })

  for (const row of failedGroups) {
    const certificateId = row.certificateId
    if (!certificateId) continue

    const dup = await recentAgentAlertExists(
      'FRAUD_ALERT',
      { path: ['certificateId'], equals: certificateId },
      oneHourAgo,
    )
    if (dup) continue

    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        entityId: true,
        publicId: true,
        entity: {
          select: {
            userId: true,
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

    await createFraudAdminAlert({
      title: 'Alerte fraude détectée',
      description: `${row._count.id} vérifications échouées en 1h — ${certLabel.label}`,
      entityId: cert?.entityId ?? undefined,
      userId: cert?.entity?.userId,
      decrementTrustScoreUserId: cert?.entity?.userId,
      metadata: {
        ...AGENT_META,
        rule: 'failed_verification_cluster',
        certificateId,
        count: row._count.id,
      },
    })
    failedClusterAlerts += 1
  }

  // Même IP — 10+ certificats distincts vérifiés en 1h
  const ipGroups = await prisma.verification.groupBy({
    by: ['ipHash'],
    where: {
      verifiedAt: { gte: oneHourAgo },
      ipHash: { not: null },
      certificateId: { not: null },
    },
    _count: { id: true },
    having: { id: { _count: { gte: 10 } } },
  })

  for (const row of ipGroups) {
    const ipHash = row.ipHash
    if (!ipHash) continue

    const dup = await recentAgentAlertExists(
      'FRAUD_ALERT',
      { path: ['ipHash'], equals: ipHash },
      oneHourAgo,
    )
    if (dup) continue

    await createFraudAdminAlert({
      title: 'Alerte fraude détectée',
      description: `IP suspecte : ${row._count.id} vérifications sur certificats distincts en 1h`,
      metadata: {
        ...AGENT_META,
        rule: 'ip_certificate_cluster',
        ipHash,
        count: row._count.id,
      },
    })
    ipClusterAlerts += 1
  }

  await writeAgentAuditLog('FRAUD_SURVEILLANCE_RUN', 'fraud-surveillance', {
    fraudAlertsCreated,
    lowTrustAlerts,
    failedClusterAlerts,
    ipClusterAlerts,
  })

  return {
    fraudAlertsCreated,
    lowTrustAlerts,
    failedClusterAlerts,
    ipClusterAlerts,
  }
}
