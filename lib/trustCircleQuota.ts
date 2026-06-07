// Quotas Trust Circle dérivés de la SOURCE UNIQUE lib/pricing.ts (SYS-3).
// Logique : friction naturelle à 80% pour inciter l'upgrade sans être agressif.

import {
  formatPlanMonthlyPriceLabel,
  getMaxTrustCircle,
  normalizePlanQuotaKey,
} from '@/lib/pricing'
import { getPlanDisplayLabel } from '@/lib/plan-features'

// Seuil déclenchant la bannière upgrade
export const UPGRADE_THRESHOLD = 0.8

// Statuts qui comptent dans le quota
export const QUOTA_STATUSES = [
  'CONFIRMED',
  'ADMIN_VERIFIED',
  'UNVERIFIED',
]

/** Pool Trust Circle du plan (null = illimité, 0 = indisponible). Source : pricing.ts. */
export function getQuotaForPlan(plan: string): { poolTotal: number | null } {
  return { poolTotal: getMaxTrustCircle(plan) }
}

export function getUpgradePlan(plan: string): string | null {
  const key = normalizePlanQuotaKey(plan)
  const upgrades: Record<string, string | null> = {
    DISCOVERY: 'PREMIUM',
    DISCOVERY_EXPIRED: 'PREMIUM',
    ESSENTIEL: 'PREMIUM',
    PREMIUM: 'FAMILLE',
    FAMILLE: null,
    FAMILLE_PLUS: null,
    SOLO_PRO: 'STARTER',
    STARTER: 'TEAM',
    TEAM: 'BUSINESS',
    BUSINESS: 'ENTERPRISE',
    ENTERPRISE: null,
  }
  return upgrades[key] ?? null
}

function formatPoolLabel(pool: number | null): string {
  if (pool == null) return 'pool illimité'
  return `${pool} contact${pool > 1 ? 's' : ''}`
}

export function buildUpgradeMessage(
  currentPlan: string,
  upgradePlan: string | null,
  current: number,
  limit: number
): string | null {
  if (!upgradePlan) return null

  const remaining = limit - current
  const currentKey = normalizePlanQuotaKey(currentPlan)
  const upgradeKey = normalizePlanQuotaKey(upgradePlan)
  const upgradeLabel = getPlanDisplayLabel(upgradePlan)
  const upgradePool = getMaxTrustCircle(upgradePlan)
  const priceLabel = formatPlanMonthlyPriceLabel(upgradePlan)
  const priceSuffix = priceLabel ? ` dès ${priceLabel}` : ''

  if (currentKey === 'ESSENTIEL' && upgradeKey === 'PREMIUM') {
    return `Plus que ${remaining} contact${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}. Passez à ${upgradeLabel} pour ${formatPoolLabel(upgradePool)} Trust Circle${priceSuffix}.`
  }

  if (currentKey === 'PREMIUM' && upgradeKey === 'FAMILLE') {
    return `Quota presque atteint (${current}/${limit}). Plan ${upgradeLabel} : ${formatPoolLabel(upgradePool)} partagés${priceSuffix}.`
  }

  if (currentKey === 'STARTER' && upgradeKey === 'TEAM') {
    return `Quota presque atteint (${current}/${limit}). Passez à ${upgradeLabel} : pool élargi${priceSuffix}.`
  }

  if (currentKey === 'TEAM' && upgradeKey === 'BUSINESS') {
    return `Pool entreprise presque plein (${current}/${limit}). ${upgradeLabel}${priceSuffix ? ` — ${priceLabel}` : ' : contactez-nous'}.`
  }

  if (currentKey === 'BUSINESS' && upgradeKey === 'ENTERPRISE') {
    return `Vous approchez la limite Business (${current}/${limit}). Contactez-nous pour ${upgradeLabel} illimité.`
  }

  return `Plus que ${remaining} contact${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}. Passez à ${upgradeLabel}${priceSuffix}.`
}
