// lib/plan-features.ts
// Source unique des capacités par plan — en particulier le plan gratuit DISCOVERY.
// blockchainStatus & Subscription.plan sont des String côté Prisma : DISCOVERY et
// NOT_ANCHORED sont des conventions de chaîne (aucune migration nécessaire).
// ============================================================

/** Plan gratuit B2C (Découverte) — badge non ancré sur la blockchain. */
export const DISCOVERY_PLAN = 'DISCOVERY' as const

/**
 * Statut blockchain d'un certificat émis sous le plan gratuit : signé ES256 mais
 * volontairement jamais ancré sur Polygon. Les agents d'ancrage doivent l'ignorer.
 */
export const BLOCKCHAIN_STATUS_NOT_ANCHORED = 'NOT_ANCHORED' as const

/** Limites du plan Découverte (gratuit). */
export const DISCOVERY_LIMITS = {
  maxProfiles: 1,
  maxContacts: 5,
  maxVerificationsPerMonth: 20,
  trustCircle: false,
  polygonAnchoring: false,
} as const

function normalizePlan(plan?: string | null): string {
  return (plan ?? '').trim().toUpperCase().replace(/-/g, '_')
}

/** True si le plan est le plan gratuit Découverte. */
export function isDiscoveryPlan(plan?: string | null): boolean {
  return normalizePlan(plan) === DISCOVERY_PLAN
}

/** Ancrage Polygon autorisé pour tous les plans SAUF Découverte (gratuit). */
export function planAllowsPolygonAnchoring(plan?: string | null): boolean {
  return !isDiscoveryPlan(plan)
}

/** Trust Circle indisponible sur le plan gratuit Découverte. */
export function planAllowsTrustCircle(plan?: string | null): boolean {
  return !isDiscoveryPlan(plan)
}

/** True si le certificat n'est volontairement pas ancré (badge preview gratuit). */
export function isNotAnchored(blockchainStatus?: string | null): boolean {
  return (blockchainStatus ?? '').trim().toUpperCase() === BLOCKCHAIN_STATUS_NOT_ANCHORED
}
