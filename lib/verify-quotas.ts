// lib/verify-quotas.ts
// Quotas de vérifications mensuelles par plan d’abonnement
// ============================================================

import { prisma } from '@/app/lib/db'

export const VERIFY_QUOTAS: Record<string, number> = {
  ESSENTIEL: Number.POSITIVE_INFINITY,
  PREMIUM: Number.POSITIVE_INFINITY,
  FAMILLE: Number.POSITIVE_INFINITY,
  FAMILLE_PLUS: Number.POSITIVE_INFINITY,
  SOLO_PRO: Number.POSITIVE_INFINITY,
  STARTER: Number.POSITIVE_INFINITY,
  TEAM: Number.POSITIVE_INFINITY,
  BUSINESS: Number.POSITIVE_INFINITY,
  ENTERPRISE: Number.POSITIVE_INFINITY,
}

function normalizePlanKey(plan: string): string {
  const p = plan.trim().toUpperCase().replace(/-/g, '_')
  return p in VERIFY_QUOTAS ? p : 'ESSENTIEL'
}

function monthYearChanged(a: Date, b: Date): boolean {
  return a.getMonth() !== b.getMonth() || a.getFullYear() !== b.getFullYear()
}

type QuotaUserRow = {
  verifyCount: number
  verifyCountReset: Date
}

function effectiveCount(user: QuotaUserRow | null, now: Date): number {
  const resetDate = user?.verifyCountReset ?? now
  const needsReset = monthYearChanged(now, resetDate)
  return needsReset ? 0 : user?.verifyCount ?? 0
}

/** Lecture seule : utile avant redirect QR → /verify/[id] (évite double consommation). */
export async function peekVerifyQuota(
  userId: string,
  plan: string,
  isAdmin: boolean
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (isAdmin) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY, limit: Number.POSITIVE_INFINITY }
  }

  const limit = VERIFY_QUOTAS[normalizePlanKey(plan)] ?? VERIFY_QUOTAS.ESSENTIEL
  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY, limit: Number.POSITIVE_INFINITY }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verifyCount: true, verifyCountReset: true },
  })

  const now = new Date()
  const currentCount = effectiveCount(user, now)

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, limit }
  }

  return { allowed: true, remaining: limit - currentCount, limit }
}

export async function checkAndIncrementVerifyQuota(
  userId: string,
  plan: string,
  isAdmin?: boolean
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (isAdmin) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY, limit: Number.POSITIVE_INFINITY }
  }

  const limit = VERIFY_QUOTAS[normalizePlanKey(plan)] ?? VERIFY_QUOTAS.ESSENTIEL
  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, remaining: Number.POSITIVE_INFINITY, limit: Number.POSITIVE_INFINITY }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verifyCount: true, verifyCountReset: true },
  })

  const now = new Date()
  const resetDate = user?.verifyCountReset ?? now
  const needsReset = monthYearChanged(now, resetDate)
  const currentCount = needsReset ? 0 : user?.verifyCount ?? 0

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, limit }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      verifyCount: needsReset ? 1 : { increment: 1 },
      ...(needsReset ? { verifyCountReset: now } : {}),
    },
  })

  const remaining = limit - currentCount - 1
  return {
    allowed: true,
    remaining,
    limit,
  }
}

/** Affichage dashboard (sans écriture). */
export async function getVerifyQuotaDisplay(
  userId: string,
  plan: string
): Promise<{ used: number; limit: number; remaining: number; unlimited: boolean }> {
  const limitRaw = VERIFY_QUOTAS[normalizePlanKey(plan)] ?? VERIFY_QUOTAS.ESSENTIEL
  if (limitRaw === Number.POSITIVE_INFINITY) {
    return { used: 0, limit: 0, remaining: 0, unlimited: true }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verifyCount: true, verifyCountReset: true },
  })

  const now = new Date()
  const used = effectiveCount(user, now)
  const remaining = Math.max(0, limitRaw - used)

  return {
    used,
    limit: limitRaw,
    remaining,
    unlimited: false,
  }
}
