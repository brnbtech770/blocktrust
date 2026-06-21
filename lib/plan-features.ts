/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
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

/** Statut d'abonnement Stripe considéré comme « payant actif ». */
export function isActiveBillingStatus(status?: string | null): boolean {
  const s = (status ?? '').trim().toLowerCase()
  return s === 'active' || s === 'trialing'
}

/**
 * SOURCE DE VÉRITÉ UNIQUE de la résolution du plan effectif d'un compte.
 * Tient compte du STATUT réel de l'abonnement Stripe (pas seulement de l'existence
 * d'une ligne Subscription) :
 *  - comptes internes (admins ADMIN_EMAILS + équipe) → Enterprise complet (jamais écrasé) ;
 *  - sinon l'abonnement Stripe UNIQUEMENT s'il est payant actif (active / trialing) ;
 *  - sinon le plan gratuit Découverte (un plan résiduel sur un abonnement
 *    inactif/canceled/past_due ne donne JAMAIS de droits payants).
 * Fail-soft : ne lève jamais.
 */
export function resolveEffectivePlan(params: {
  subscription?: { plan?: string | null; status?: string | null } | null
  email?: string | null
  /** Court-circuit explicite (déjà calculé en amont). Sinon dérivé de `email`. */
  isAdmin?: boolean
}): string {
  if (params.isAdmin || isInternalAccount(params.email)) return 'B2B_ENTERPRISE'
  const sub = params.subscription
  const plan = (sub?.plan ?? '').trim()
  if (plan.length > 0 && isActiveBillingStatus(sub?.status)) return plan
  return DEFAULT_B2C_PLAN
}

/**
 * @deprecated Utiliser {@link resolveEffectivePlan} qui tient compte du statut Stripe.
 * Conservé pour compatibilité (call sites legacy sans information de statut) :
 * suppose un abonnement actif lorsque `subscriptionPlan` est renseigné.
 */
export function resolveAccountPlan(
  subscriptionPlan: string | null | undefined,
  opts?: { isAdmin?: boolean },
): string {
  const p = (subscriptionPlan ?? '').trim()
  return resolveEffectivePlan({
    subscription: p.length > 0 ? { plan: p, status: 'active' } : null,
    isAdmin: opts?.isAdmin,
  })
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
  ENTERPRISE: 'Entreprise',
  B2B_ENTERPRISE: 'Entreprise',
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

/**
 * Plans (hors préfixe B2C_/B2B_) autorisant le Réseau de confiance (Trust Circle).
 * Aligné sur la grille de vente lib/pricing.ts : réservé à partir de Premium côté B2C
 * (donc PAS Découverte ni Essentiel) et à tous les plans professionnels.
 */
const TRUST_CIRCLE_PLANS = new Set<string>([
  'PREMIUM',
  'FAMILLE',
  'FAMILLE_PLUS',
  'SOLO_PRO',
  'STARTER',
  'TEAM',
  'BUSINESS',
  'ENTERPRISE',
])

/**
 * Trust Circle disponible à partir de Premium (B2C) et sur tous les plans B2B.
 * Indisponible sur Découverte (gratuit) et Essentiel.
 */
export function planAllowsTrustCircle(plan?: string | null): boolean {
  const key = normalizePlan(plan).replace(/^B2[CB]_/, '')
  return TRUST_CIRCLE_PLANS.has(key)
}

/** True si le certificat n'est volontairement pas ancré (badge preview gratuit). */
export function isNotAnchored(blockchainStatus?: string | null): boolean {
  return (blockchainStatus ?? '').trim().toUpperCase() === BLOCKCHAIN_STATUS_NOT_ANCHORED
}
