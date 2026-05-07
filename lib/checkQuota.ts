// lib/checkQuota.ts
// Vérification des quotas utilisateur selon le plan
// ============================================================

import { prisma } from '@/app/lib/db'

export type QuotaCheckResult = {
  allowed: boolean
  reason?: string
  current?: number
  max?: number
}

/**
 * Vérifie si l'utilisateur peut créer une nouvelle entité
 */
export async function checkEntityQuota(userId: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      plan: true,
    },
  })

  if (!user) {
    return { allowed: false, reason: 'Utilisateur non trouvé' }
  }

  // Déterminer le plan actif
  const plan = user.subscription?.plan || 'ESSENTIEL'
  const fromPlanRow = user.plan?.maxEntities
  const maxEntities =
    fromPlanRow != null && fromPlanRow > 0 ? fromPlanRow : getMaxEntities(plan)

  // Compter les entités existantes
  const currentEntities = await prisma.entity.count({
    where: { userId },
  })

  if (currentEntities >= maxEntities) {
    return {
      allowed: false,
      reason: `Limite d'entités atteinte (${maxEntities} max)`,
      current: currentEntities,
      max: maxEntities,
    }
  }

  return {
    allowed: true,
    current: currentEntities,
    max: maxEntities,
  }
}

/**
 * Vérifie si l'utilisateur peut créer un nouveau certificat
 */
export async function checkCertificateQuota(userId: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      plan: true,
    },
  })

  if (!user) {
    return { allowed: false, reason: 'Utilisateur non trouvé' }
  }

  // Déterminer le plan actif
  const plan = user.subscription?.plan || 'ESSENTIEL'
  const maxCertificates = getMaxCertificates(plan)

  // Compter les certificats actifs
  const activeCertificates = await prisma.certificate.count({
    where: {
      entity: { userId },
      status: { in: ['ACTIVE', 'ANCHORED', 'PENDING'] },
    },
  })

  if (activeCertificates >= maxCertificates) {
    return {
      allowed: false,
      reason: `Limite de certificats atteinte (${maxCertificates} max)`,
      current: activeCertificates,
      max: maxCertificates,
    }
  }

  return {
    allowed: true,
    current: activeCertificates,
    max: maxCertificates,
  }
}

/**
 * Retourne le nombre maximum d'entités selon le plan
 */
function getMaxEntities(plan: string): number {
  const limits: Record<string, number> = {
    ESSENTIEL: 20,
    PREMIUM: 100,
    FAMILLE: 100,
    FAMILLE_PLUS: 300,
    SOLO_PRO: 100,
    STARTER: 500,
    TEAM: 3000,
    BUSINESS: 25000,
    ENTERPRISE: 999999,
  }

  return limits[plan] ?? 1
}

/**
 * Quota contacts (entités) pour l’extension / dashboards.
 */
export async function getEntityQuotaSnapshot(userId: string): Promise<{
  current: number
  max: number
  plan: string
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true, subscription: true },
  })

  if (!user) return null

  const planStr = user.subscription?.plan ?? 'ESSENTIEL'
  const fromPlanRow = user.plan?.maxEntities
  const max = fromPlanRow != null && fromPlanRow > 0 ? fromPlanRow : getMaxEntities(planStr)

  const current = await prisma.entity.count({ where: { userId } })

  return { current, max, plan: planStr }
}

/**
 * Retourne le nombre maximum de certificats selon le plan
 */
function getMaxCertificates(plan: string): number {
  const limits: Record<string, number> = {
    ESSENTIEL: 1,
    PREMIUM: 5,
    FAMILLE: 10,
    FAMILLE_PLUS: 999999, // Illimité
  }

  return limits[plan] || 1
}
