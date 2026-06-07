// Quotas Trust Circle dérivés de la SOURCE UNIQUE lib/pricing.ts (SYS-3).
// Logique : friction naturelle à 80% pour inciter l'upgrade sans être agressif.

import { getMaxTrustCircle } from '@/lib/pricing'

// Seuil déclenchant la bannière upgrade
export const UPGRADE_THRESHOLD = 0.8

// Statuts qui comptent dans le quota
// ❌ PENDING (invitations non acceptées) ne compte PAS
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
  const upgrades: Record<string, string | null> = {
    'ESSENTIEL':    'PREMIUM',
    'PREMIUM':      'FAMILLE',
    'FAMILLE':      null, // Famille = palier B2C max (Famille+ legacy, non vendu)
    'FAMILLE_PLUS': null,
    'SOLO_PRO':     'STARTER',
    'STARTER':      'TEAM',
    'TEAM':         'BUSINESS',
    'BUSINESS':     'ENTERPRISE',
    'ENTERPRISE':   null,
  }
  return upgrades[plan] ?? null
}

export function buildUpgradeMessage(
  currentPlan: string,
  upgradePlan: string | null,
  current: number,
  limit: number
): string | null {
  if (!upgradePlan) return null
  const remaining = limit - current
  const messages: Record<string, string> = {
    'ESSENTIEL_PREMIUM':
      `Plus que ${remaining} contact${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}. Passez à Premium pour 40 contacts.`,
    'PREMIUM_FAMILLE':
      `Quota presque atteint (${current}/${limit}). Plan Famille : 80 contacts partagés dès 17,99€/mois.`,
    'STARTER_TEAM':
      `Quota presque atteint (${current}/${limit}). Passez à Team : pool élargi et 200 contacts par utilisateur.`,
    'TEAM_BUSINESS':
      `Pool entreprise presque plein (${current}/${limit}). Business : 500 contacts par utilisateur.`,
    'BUSINESS_ENTERPRISE':
      `Vous approchez la limite Business (${current}/${limit}). Contactez-nous pour Enterprise illimité.`,
  }
  const key = `${currentPlan}_${upgradePlan}`
  return messages[key] ??
    `Plus que ${remaining} contact${remaining > 1 ? 's' : ''} disponible${remaining > 1 ? 's' : ''}.`
}
