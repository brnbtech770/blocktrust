// Quotas par plan — source de vérité unique
// Logique : friction naturelle à 80% pour
// inciter l'upgrade sans être agressif

export const TRUST_CIRCLE_QUOTAS = {
  // B2C — quota = pool total flexible entre profils
  ESSENTIEL:    { poolTotal: 10,   perProfile: 10   },
  PREMIUM:      { poolTotal: 40,   perProfile: 40   },
  FAMILLE:      { poolTotal: 80,   perProfile: null },
  FAMILLE_PLUS: { poolTotal: 200,  perProfile: null },

  // B2B — quota par poste + pool entreprise
  SOLO_PRO:     { poolTotal: 100,  perUser: 100 },
  STARTER:      { poolTotal: 500,  perUser: 100 },
  TEAM:         { poolTotal: 3000, perUser: 200 },
  BUSINESS:     { poolTotal: 25000, perUser: 500 },
  ENTERPRISE:   { poolTotal: null, perUser: null },
} as const

// Seuil déclenchant la bannière upgrade
export const UPGRADE_THRESHOLD = 0.8

// Statuts qui comptent dans le quota
// ❌ PENDING (invitations non acceptées) ne compte PAS
export const QUOTA_STATUSES = [
  'CONFIRMED',
  'ADMIN_VERIFIED',
  'UNVERIFIED',
]

export function getQuotaForPlan(plan: string) {
  const map: Record<string, { poolTotal: number | null; perProfile?: number | null; perUser?: number | null }> = {
    'ESSENTIEL':    TRUST_CIRCLE_QUOTAS.ESSENTIEL,
    'PREMIUM':      TRUST_CIRCLE_QUOTAS.PREMIUM,
    'FAMILLE':      TRUST_CIRCLE_QUOTAS.FAMILLE,
    'FAMILLE_PLUS': TRUST_CIRCLE_QUOTAS.FAMILLE_PLUS,
    'SOLO_PRO':     TRUST_CIRCLE_QUOTAS.SOLO_PRO,
    'STARTER':      TRUST_CIRCLE_QUOTAS.STARTER,
    'TEAM':         TRUST_CIRCLE_QUOTAS.TEAM,
    'BUSINESS':     TRUST_CIRCLE_QUOTAS.BUSINESS,
    'ENTERPRISE':   TRUST_CIRCLE_QUOTAS.ENTERPRISE,
  }
  return map[plan] ?? TRUST_CIRCLE_QUOTAS.ESSENTIEL
}

export function getUpgradePlan(plan: string): string | null {
  const upgrades: Record<string, string | null> = {
    'ESSENTIEL':    'PREMIUM',
    'PREMIUM':      'FAMILLE',
    'FAMILLE':      'FAMILLE_PLUS',
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
      `Quota presque atteint (${current}/${limit}). Plan Famille : 80 contacts partagés dès 14,99€/mois.`,
    'FAMILLE_FAMILLE_PLUS':
      `Pool familial presque plein (${current}/${limit}). Famille+ : 200 contacts dès 24,99€/mois.`,
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
