// lib/verify-fraud.ts
// En-têtes sécurité, alertes admin, détection d’anomalies (flux /verify).
// ============================================================

import { prisma } from '@/app/lib/db'
import type { Prisma } from '@prisma/client'
import { createAdminAlert } from '@/lib/admin-alerts'

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
}) {
  const titleByType = {
    FRAUD_ALERT: 'Alerte fraude (vérification publique)',
    SUSPICIOUS_VOLUME: 'Volume de vérifications suspect',
    SUSPICIOUS_SCANNING: 'Scan multi-certificats suspect',
  } as const

  const parts: string[] = []
  if (args.certificateId) parts.push(`Certificat ${args.certificateId}`)
  if (args.entityId) parts.push(`Entité ${args.entityId}`)

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
