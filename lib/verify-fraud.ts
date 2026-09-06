/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// lib/verify-fraud.ts
// En-têtes sécurité, alertes admin, détection d’anomalies (flux /verify).
// ============================================================

import * as React from 'react'
import { prisma } from '@/app/lib/db'
import type { Prisma } from '@prisma/client'
import {
  getCertificateOwnerForGraceCheck,
  getUserForGraceCheck,
  recentDuplicateAdminAlert,
  recordGracePeriodSkip,
  shouldSkipAlertForNewAccount,
} from '@/lib/alert-grace-period'
import { createAdminAlert } from '@/lib/admin-alerts'
import { sendEmailFireAndForget } from '@/lib/email'
import { FraudAlertEmail, subject as fraudAlertCertificateSubject } from '@/emails/FraudAlertEmail'
import {
  entityDisplayNameFromEntity,
  formatUserLabel,
} from '@/lib/format-certificate-label'
import { fetchCertificateLabel } from '@/lib/fetch-certificate-label'

export const VERIFY_SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
} as const

export function verifyRateLimitHeaders(remaining: number): Record<string, string> {
  return {
    ...VERIFY_SECURITY_HEADERS,
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
  }
}

export async function logRateLimitedVerification(args: {
  ipHash: string
  userAgent: string
  referer: string | null
  jti?: string | null
}) {
  await prisma.verification.create({
    data: {
      certificateId: null,
      ipHash: args.ipHash,
      userAgent: args.userAgent.slice(0, 500),
      referer: args.referer,
      result: 'RATE_LIMITED',
      signatureJti: args.jti ?? null,
      metadata: { timestamp: new Date().toISOString() } as Prisma.InputJsonValue,
    },
  })
}

export async function createAdminFraudAlert(args: {
  type: 'FRAUD_ALERT' | 'SUSPICIOUS_VOLUME' | 'SUSPICIOUS_SCANNING'
  entityId?: string | null
  certificateId?: string | null
  userId?: string | null
  metadata?: Record<string, unknown>
}): Promise<{ created: boolean; skipped?: 'dedup' | 'grace' }> {
  if (args.certificateId) {
    const dup = await recentDuplicateAdminAlert(args.type, args.certificateId)
    if (dup) return { created: false, skipped: 'dedup' }
  }

  const graceUser =
    (args.userId ? await getUserForGraceCheck(args.userId) : null) ??
    (args.certificateId ? await getCertificateOwnerForGraceCheck(args.certificateId) : null)

  if (
    shouldSkipAlertForNewAccount(graceUser, args.type, {
      metadata: args.metadata,
      count: typeof args.metadata?.count === 'number' ? args.metadata.count : undefined,
    })
  ) {
    if (graceUser) {
      await recordGracePeriodSkip({
        userId: graceUser.id,
        alertType: args.type,
        rule: typeof args.metadata?.reason === 'string' ? args.metadata.reason : undefined,
      })
    }
    return { created: false, skipped: 'grace' }
  }

  const titleByType = {
    FRAUD_ALERT: 'Alerte fraude (vérification publique)',
    SUSPICIOUS_VOLUME: 'Volume de vérifications suspect',
    SUSPICIOUS_SCANNING: 'Scan multi-certificats suspect',
  } as const

  const parts: string[] = []
  if (args.certificateId) {
    const certLabel = await fetchCertificateLabel(args.certificateId)
    parts.push(certLabel?.label ?? `Certificat …${args.certificateId.slice(-4)}`)
  } else if (args.entityId) {
    const entity = await prisma.entity.findUnique({
      where: { id: args.entityId },
      select: {
        entityType: true,
        firstName: true,
        lastName: true,
        legalName: true,
        tradeName: true,
        email: true,
      },
    })
    if (entity) {
      const name = entityDisplayNameFromEntity(entity)
      if (name) parts.push(name)
    }
  } else if (args.userId) {
    const user = await prisma.user.findUnique({
      where: { id: args.userId },
      select: { id: true, name: true, email: true },
    })
    if (user) parts.push(formatUserLabel(user))
  }

  await createAdminAlert({
    type: args.type,
    title: titleByType[args.type],
    description: parts.length ? parts.join(' · ') : 'Anomalie détectée sur /verify',
    entityId: args.entityId ?? undefined,
    userId: args.userId ?? undefined,
    metadata: {
      ...(args.metadata ?? {}),
      ...(args.certificateId ? { certificateId: args.certificateId } : {}),
    },
  })

  return { created: true }
}

export type AnomalyKind = 'SUSPICIOUS_VOLUME' | 'SUSPICIOUS_SCANNING'

export async function evaluateVerifyAnomalies(
  certificateId: string,
  ipHash: string
): Promise<{ kind: AnomalyKind | null; distinctIpCount?: number; distinctCertCount?: number }> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const ipRows = await prisma.verification.findMany({
    where: {
      certificateId,
      verifiedAt: { gte: hourAgo },
      ipHash: { not: null },
    },
    select: { ipHash: true },
  })
  const ipSet = new Set(ipRows.map((r) => r.ipHash!))
  ipSet.add(ipHash)
  const volume = ipSet.size > 20

  const fiveAgo = new Date(Date.now() - 5 * 60 * 1000)
  const certRows = await prisma.verification.findMany({
    where: {
      ipHash,
      verifiedAt: { gte: fiveAgo },
      certificateId: { not: null },
    },
    select: { certificateId: true },
  })
  const certSet = new Set(certRows.map((r) => r.certificateId!))
  certSet.add(certificateId)
  const scanning = certSet.size > 5

  if (scanning) {
    return { kind: 'SUSPICIOUS_SCANNING', distinctCertCount: certSet.size }
  }
  if (volume) {
    return { kind: 'SUSPICIOUS_VOLUME', distinctIpCount: ipSet.size }
  }
  return { kind: null }
}

const DASHBOARD_PUBLIC_BASE =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

function entityDisplayNameForFraudEmail(entity: {
  entityType: string
  legalName: string | null
  tradeName: string | null
  firstName: string | null
  lastName: string | null
  email: string
}): string {
  if (entity.entityType === 'INDIVIDUAL') {
    const n = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim()
    return n || entity.email
  }
  return entity.legalName || entity.tradeName || entity.email
}

/**
 * Email au titulaire du certificat (fire-and-forget). À appeler après persistance d’une Verification FRAUD_ALERT.
 */
export function notifyCertificateOwnerFraudAlertFireAndForget(args: {
  certificateId: string
  alertType: string
  detail?: string | null
}): void {
  void (async () => {
    try {
      const cert = await prisma.certificate.findUnique({
        where: { id: args.certificateId },
        include: {
          entity: {
            include: { user: { select: { email: true } } },
          },
        },
      })
      const to = cert?.entity?.user?.email
      if (!to || !cert.entity) return

      const entityName = entityDisplayNameForFraudEmail(cert.entity)
      const occurredAt = new Date().toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })

      sendEmailFireAndForget({
        to,
        subject: fraudAlertCertificateSubject,
        react: React.createElement(FraudAlertEmail, {
          entityName,
          alertType: args.alertType,
          occurredAt,
          detail: args.detail ?? undefined,
          dashboardUrl: `${DASHBOARD_PUBLIC_BASE}/dashboard`,
        }),
      })
    } catch (e) {
      console.error('[notifyCertificateOwnerFraudAlert]', e)
    }
  })()
}
