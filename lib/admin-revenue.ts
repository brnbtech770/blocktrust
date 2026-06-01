// lib/admin-revenue.ts
// Aide MRR / période de facturation à partir de Subscription (Prisma) + price IDs Stripe
// ============================================================

/** Prix mensuel catalogue (€ TTC) — aligné dashboard admin & offres. */
export const ADMIN_PLAN_PRICES_MONTHLY: Record<string, number> = {
  // Grille finale (1er juin 2026)
  DISCOVERY: 0,
  ESSENTIEL: 3.99,
  PREMIUM: 6.99,
  FAMILLE: 17.99,
  STARTER: 12.99,
  TEAM: 8.99,
  ENTERPRISE: 0,
  // Plans retirés de la vente — conservés pour les abonnés existants (MRR)
  FAMILLE_PLUS: 24.99,
  SOLO_PRO: 9.99,
  BUSINESS: 5.99,
}

/** IDs Stripe « yearly » connus (env). */
export function getYearlyStripePriceIdSet(): Set<string> {
  const ids = [
    process.env.STRIPE_PRICE_ESSENTIEL_YEARLY,
    process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    process.env.STRIPE_PRICE_FAMILLE_YEARLY,
    process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY,
    process.env.STRIPE_PRICE_SOLO_PRO_YEARLY,
    process.env.STRIPE_PRICE_STARTER_YEARLY,
    process.env.STRIPE_PRICE_TEAM_YEARLY,
    process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  ].filter((x): x is string => Boolean(x && x.length > 0))
  return new Set(ids)
}

export type BillingPeriodLabel = 'MONTHLY' | 'YEARLY' | 'UNKNOWN'

export function getBillingPeriodFromStripePriceId(
  stripePriceId: string | null | undefined,
  yearlyIds = getYearlyStripePriceIdSet(),
): BillingPeriodLabel {
  if (!stripePriceId) return 'UNKNOWN'
  if (yearlyIds.has(stripePriceId)) return 'YEARLY'
  return 'MONTHLY'
}

/** MRR € pour un abonnement actif (formule engagement annuel -20 % → contribution mensuelle). */
export function monthlyRevenueForSubscription(
  plan: string,
  stripePriceId: string | null | undefined,
  yearlyIds = getYearlyStripePriceIdSet(),
): number {
  const base = ADMIN_PLAN_PRICES_MONTHLY[plan] ?? 0
  if (base <= 0) return 0
  const period = getBillingPeriodFromStripePriceId(stripePriceId, yearlyIds)
  if (period === 'YEARLY') {
    return (base * 12 * 0.8) / 12
  }
  return base
}
