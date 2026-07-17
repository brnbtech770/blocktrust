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

/** Champs Subscription utilisés pour résoudre le plan effectif. */
export type PlanResolutionSubscription = {
  plan?: string | null
  status?: string | null
  stripeSubscriptionId?: string | null
  currentPeriodEnd?: Date | null
}

function resolveActiveSubscriptionPlan(sub: PlanResolutionSubscription): string | null {
  const plan = (sub.plan ?? '').trim()
  if (!plan.length || !isActiveBillingStatus(sub.status)) return null

  // Abonnement Stripe payant : inchangé (active / trialing suffit).
  if (sub.stripeSubscriptionId) return plan

  // Trial interne sans Stripe.
  const periodEnd = sub.currentPeriodEnd
  if (periodEnd instanceof Date) {
    return periodEnd.getTime() > Date.now() ? plan : null
  }

  // Actif sans Stripe ni date de fin : plan payant explicite (trial ambassadeur / sync partielle).
  if (!isDiscoveryPlan(plan)) return plan

  return null
}

function planTypeToEffectivePlan(planType?: string | null): string | null {
  const key = normalizePlan(planType)
  if (!key || key === DISCOVERY_PLAN || key === DISCOVERY_EXPIRED_PLAN) return null
  if (key.startsWith('B2C_') || key.startsWith('B2B_')) {
    return key.replace(/^B2C_/, '').replace(/^B2B_/, '') || null
  }
  return key
}

/**
 * SOURCE DE VÉRITÉ UNIQUE de la résolution du plan effectif d'un compte.
 *  - comptes internes (admins ADMIN_EMAILS + équipe) → Enterprise complet ;
 *  - abonnement Stripe actif (active / trialing + stripeSubscriptionId) → subscription.plan ;
 *  - trial interne sans Stripe : active + currentPeriodEnd > now → subscription.plan ;
 *  - trial interne expiré (active + currentPeriodEnd passée, sans Stripe) → Découverte ;
 *  - subscription.plan DISCOVERY_EXPIRED (J+30) → DISCOVERY_EXPIRED (lecture seule) ;
 *  - sinon Découverte (abonnement inactif / canceled / past_due).
 * Fail-soft : ne lève jamais.
 */
export function resolveEffectivePlan(params: {
  subscription?: PlanResolutionSubscription | null
  email?: string | null
  /** Court-circuit explicite (déjà calculé en amont). Sinon dérivé de `email`. */
  isAdmin?: boolean
  /** User.plan.type — filet si Subscription.plan reste DISCOVERY alors que planId Premium est lié. */
  planType?: string | null
}): string {
  if (params.isAdmin || isInternalAccount(params.email)) return 'B2B_ENTERPRISE'
  const sub = params.subscription
  if (!sub) return DEFAULT_B2C_PLAN

  // Période Découverte terminée (J+30) — prioritaire même si status inactive (onboarding-monitor).
  if (isDiscoveryExpired(sub.plan)) return DISCOVERY_EXPIRED_PLAN

  const activePlan = resolveActiveSubscriptionPlan(sub)
  if (activePlan && !isDiscoveryPlan(activePlan)) return activePlan

  // Trial interne : Subscription.plan peut rester DISCOVERY (défaut Prisma) avec User.planId Premium.
  if (
    isActiveBillingStatus(sub.status) &&
    !sub.stripeSubscriptionId &&
    sub.currentPeriodEnd instanceof Date &&
    sub.currentPeriodEnd.getTime() > Date.now()
  ) {
    const fromPlanType = planTypeToEffectivePlan(params.planType)
    if (fromPlanType) return fromPlanType
  }

  if (activePlan) return activePlan
  return DEFAULT_B2C_PLAN
}

/**
 * @deprecated Utiliser {@link resolveEffectivePlan}.
 * Conservé pour compatibilité (call sites legacy sans objet Subscription complet).
 */
export function resolveAccountPlan(
  subscriptionPlan: string | null | undefined,
  opts?: {
    isAdmin?: boolean
    subscriptionStatus?: string | null
    stripeSubscriptionId?: string | null
    currentPeriodEnd?: Date | null
  },
): string {
  const p = (subscriptionPlan ?? '').trim()
  const hasSub = p.length > 0 || opts?.subscriptionStatus != null
  return resolveEffectivePlan({
    subscription: hasSub
      ? {
          plan: p.length > 0 ? p : null,
          status: opts?.subscriptionStatus ?? (p.length > 0 ? 'active' : null),
          stripeSubscriptionId: opts?.stripeSubscriptionId ?? null,
          currentPeriodEnd: opts?.currentPeriodEnd ?? null,
        }
      : null,
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
