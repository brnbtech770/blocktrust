// lib/plan-features.ts
// Source unique des capacités par plan — en particulier le plan gratuit DISCOVERY.
// blockchainStatus & Subscription.plan sont des String côté Prisma : DISCOVERY et
// NOT_ANCHORED sont des conventions de chaîne (aucune migration nécessaire).
// ============================================================

import { isInternalAccount } from '@/lib/admin-utils'

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

/**
 * Mapping UNIQUE des libellés de plan affichés à l'utilisateur.
 * Source : plan résolu par resolveAccountPlan (jamais de libellé codé en dur ailleurs).
 * Gère les codes courts (DISCOVERY, STARTER…) et préfixés (B2B_STARTER, B2C_ESSENTIEL…).
 */
const PLAN_DISPLAY_LABELS: Record<string, string> = {
  DISCOVERY: 'Découverte',
  DISCOVERY_EXPIRED: 'Découverte expirée',
  ESSENTIEL: 'Essentiel',
  B2C_ESSENTIEL: 'Essentiel',
  PREMIUM: 'Premium',
  B2C_PREMIUM: 'Premium',
  FAMILLE: 'Famille',
  B2C_FAMILLE: 'Famille',
  FAMILLE_PLUS: 'Famille+',
  B2C_FAMILLE_PLUS: 'Famille+',
  SOLO_PRO: 'Solo Pro',
  B2B_SOLO_PRO: 'Solo Pro',
  STARTER: 'Starter',
  B2B_STARTER: 'Starter',
  TEAM: 'Team',
  B2B_TEAM: 'Team',
  BUSINESS: 'Business',
  B2B_BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
  B2B_ENTERPRISE: 'Enterprise',
}

/**
 * Libellé d'un plan affiché à l'utilisateur, dérivé de resolveAccountPlan.
 * - Comptes internes (admins + Johanna) → « Compte interne » (cosmétique uniquement,
 *   les droits Enterprise restent inchangés).
 * - Jamais de défaut « Essentiel » : un compte sans plan connu → « Découverte ».
 */
export function getPlanDisplayLabel(
  plan: string | null | undefined,
  opts?: { email?: string | null },
): string {
  if (opts?.email && isInternalAccount(opts.email)) return 'Compte interne'
  const key = normalizePlan(plan)
  return PLAN_DISPLAY_LABELS[key] ?? 'Découverte'
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
