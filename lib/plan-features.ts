// lib/plan-features.ts
// Source unique des capacités par plan — en particulier le plan gratuit DISCOVERY.
// blockchainStatus & Subscription.plan sont des String côté Prisma : DISCOVERY et
// NOT_ANCHORED sont des conventions de chaîne (aucune migration nécessaire).
// ============================================================

/** Plan gratuit B2C (Découverte) — badge non ancré sur la blockchain. */
export const DISCOVERY_PLAN = 'DISCOVERY' as const

/** Plan par défaut d'un compte B2C sans abonnement actif : le plan gratuit Découverte. */
export const DEFAULT_B2C_PLAN = DISCOVERY_PLAN

/**
 * Plan d'un compte dont la période Découverte gratuite (30 jours) est terminée.
 * Données conservées, mais badge preview désactivé, vérifications bloquées, contacts en lecture seule.
 * Convention de chaîne (Subscription.plan est un String côté Prisma — aucune migration).
 */
export const DISCOVERY_EXPIRED_PLAN = 'DISCOVERY_EXPIRED' as const

/** Durée de la période Découverte gratuite, en jours. */
export const DISCOVERY_DURATION_DAYS = 30

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

/** True si le plan est le plan gratuit Découverte (période active). */
export function isDiscoveryPlan(plan?: string | null): boolean {
  return normalizePlan(plan) === DISCOVERY_PLAN
}

/** True si la période Découverte gratuite est terminée (compte gelé en lecture seule). */
export function isDiscoveryExpired(plan?: string | null): boolean {
  return normalizePlan(plan) === DISCOVERY_EXPIRED_PLAN
}

/**
 * Résout le plan effectif d'un compte :
 *  - admin (ADMIN_EMAILS) → Enterprise (jamais écrasé) ;
 *  - sinon l'abonnement Stripe s'il existe ;
 *  - sinon le plan gratuit Découverte (compte B2C sans abonnement).
 * Fail-soft : ne lève jamais.
 */
export function resolveAccountPlan(
  subscriptionPlan: string | null | undefined,
  opts?: { isAdmin?: boolean },
): string {
  if (opts?.isAdmin) return 'B2B_ENTERPRISE'
  const p = (subscriptionPlan ?? '').trim()
  return p.length > 0 ? p : DEFAULT_B2C_PLAN
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
