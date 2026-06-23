// lib/alert-grace-period.ts
// Période de grâce 72 h — évite les faux positifs sur comptes neufs (Découverte).
// ============================================================

import { prisma } from '@/app/lib/db'
import { isDiscoveryPlan } from '@/lib/plan-features'
import type { Prisma } from '@prisma/client'

export const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000
export const RECENT_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000
export const VOLUME_ALERT_MIN_DURING_GRACE = 100
export const ALERT_DEDUP_WINDOW_MS = 60 * 60 * 1000

/** Raisons de fraude avérée — jamais filtrées par la période de grâce. */
export const CRITICAL_FRAUD_REASONS = new Set([
  'CONTEXT_MISMATCH',
  'CONTEXT_MISMATCH_PUBLIC_VERIFY',
  'TRUST_CIRCLE_CERT_MISMATCH',
  'context_hash_mismatch',
  'SIGNATURE_NOT_FOUND',
  'SIGNATURE_MISMATCH',
  'bad_id_prefix_typo_or_fraud',
])

const NEVER_SKIP_TYPES = new Set([
  'SUSPICIOUS_REGISTRATION',
  'NEW_USER',
  'NEW_PAYMENT',
  'CERT_PENDING',
  'CERT_ACTIVATED',
  'CERT_REVOKED',
  'MANUAL_TRUST_REQUEST',
])

export function isInGracePeriod(user: { createdAt: Date }): boolean {
  return Date.now() - user.createdAt.getTime() < GRACE_PERIOD_MS
}

export function accountAgeMs(user: { createdAt: Date }): number {
  return Date.now() - user.createdAt.getTime()
}

export function isCriticalFraudMetadata(metadata?: Record<string, unknown> | null): boolean {
  if (!metadata) return false
  const reason = metadata.reason
  if (typeof reason === 'string' && CRITICAL_FRAUD_REASONS.has(reason)) return true
  if (metadata.rule === 'revoked_still_scanned') return true
  return false
}

function resolveCount(options?: {
  metadata?: Record<string, unknown>
  count?: number
}): number {
  if (typeof options?.count === 'number') return options.count
  const metaCount = options?.metadata?.count
  return typeof metaCount === 'number' ? metaCount : 0
}

/**
 * True si l'alerte doit être ignorée pour un compte en période de grâce (< 72 h).
 * Les indicateurs de fraude avérée (CONTEXT_MISMATCH, etc.) ne sont jamais filtrés.
 */
export function shouldSkipAlertForNewAccount(
  user: { createdAt: Date } | null | undefined,
  alertType: string,
  options?: {
    metadata?: Record<string, unknown>
    count?: number
  },
): boolean {
  if (NEVER_SKIP_TYPES.has(alertType)) return false
  if (!user || !isInGracePeriod(user)) return false
  if (isCriticalFraudMetadata(options?.metadata)) return false

  if (alertType === 'SUSPICIOUS_VOLUME') {
    const count = resolveCount(options)
    if (count >= VOLUME_ALERT_MIN_DURING_GRACE) return false
  }

  return true
}

/** TrustScore bas : inadapté au plan Découverte ; seuil tolérant < 7 j. */
export function shouldAlertLowTrustScore(params: {
  trustScore: number
  accountAgeMs: number
  plan: string
}): boolean {
  if (isDiscoveryPlan(params.plan)) return false

  if (params.accountAgeMs < RECENT_ACCOUNT_MS) {
    return params.trustScore < 10
  }
  return params.trustScore < 30
}

/** Rappels KYC réservés aux plans payants (pas Découverte). */
export function shouldSendKycReminder(plan: string): boolean {
  const p = plan.trim().toUpperCase()
  return p !== 'DISCOVERY' && p !== 'DISCOVERY_EXPIRED'
}

export async function recordGracePeriodSkip(args: {
  userId: string
  alertType: string
  rule?: string
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        action: 'ALERT_GRACE_SKIPPED',
        resource: 'admin-alert',
        resourceId: args.userId,
        userId: args.userId,
        newValue: {
          alertType: args.alertType,
          rule: args.rule ?? null,
        } as Prisma.InputJsonValue,
      },
    })
    .catch(() => null)
}

export async function recentDuplicateAdminAlert(
  type: string,
  certificateId: string,
  windowMs: number = ALERT_DEDUP_WINDOW_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs)
  const existing = await prisma.adminAlert.findFirst({
    where: {
      type,
      createdAt: { gte: since },
      metadata: { path: ['certificateId'], equals: certificateId },
    },
    select: { id: true },
  })
  return Boolean(existing)
}

export async function getUserForGraceCheck(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      email: true,
      subscription: { select: { plan: true, status: true } },
    },
  })
}

export async function getCertificateOwnerForGraceCheck(certificateId: string) {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      entity: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              createdAt: true,
              email: true,
              subscription: { select: { plan: true, status: true } },
            },
          },
        },
      },
    },
  })
  return cert?.entity?.user ?? null
}

export type AdminAlertDailySummary = {
  alertsToday: number
  graceSkipsToday: number
}

export async function getAdminAlertDailySummary(): Promise<AdminAlertDailySummary> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [alertsToday, graceSkipsToday] = await Promise.all([
    prisma.adminAlert.count({ where: { createdAt: { gte: startOfDay } } }).catch(() => 0),
    prisma.auditLog
      .count({ where: { action: 'ALERT_GRACE_SKIPPED', createdAt: { gte: startOfDay } } })
      .catch(() => 0),
  ])

  return { alertsToday, graceSkipsToday }
}
