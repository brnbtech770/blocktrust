// lib/pricing.ts
// Plans B2C & B2B — Price IDs mensuel ET annuel (Stripe)
// ============================================================

export type BillingInterval = 'monthly' | 'yearly'

export const PLANS_B2C = [
  {
    id:          'ESSENTIEL',
    name:        'Essentiel',
    profiles:    1,
    entities:    20,
    highlighted: false,
    prices: {
      monthly: {
        amount:  4.99,
        priceId: process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY!,
      },
      yearly: {
        amount:  47.90,
        priceId: process.env.STRIPE_PRICE_ESSENTIEL_YEARLY!,
        saving:  '20%',
      },
    },
    features: [
      { label: '1 profil certifié',              included: true  },
      { label: "Jusqu'à 20 entités",             included: true  },
      { label: 'Badge QR multi-support',         included: true  },
      { label: 'Page de vérification publique',  included: true  },
      { label: 'Trust Circle : 20 identités',    included: true  },
      { label: 'Support email',                  included: true  },
      { label: 'Statistiques de vérification',   included: false },
      { label: 'Alertes fraude email',           included: false },
      { label: 'Multi-profils',                  included: false },
    ],
  },
  {
    id:          'PREMIUM',
    name:        'Premium',
    profiles:    1,
    entities:    100,
    highlighted: true,
    prices: {
      monthly: {
        amount:  9.99,
        priceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY!,
      },
      yearly: {
        amount:  95.90,
        priceId: process.env.STRIPE_PRICE_PREMIUM_YEARLY!,
        saving:  '20%',
      },
    },
    features: [
      { label: '1 profil certifié',              included: true },
      { label: "Jusqu'à 100 entités",            included: true },
      { label: 'Badge QR multi-support',         included: true },
      { label: 'Page de vérification publique',  included: true },
      { label: 'Trust Circle : 100 identités',   included: true },
      { label: 'Statistiques vérifications',     included: true },
      { label: 'Alertes fraude email',           included: true },
      { label: 'Support prioritaire',            included: true },
      { label: 'Multi-profils',                  included: false },
    ],
  },
  {
    id:          'FAMILLE',
    name:        'Famille',
    profiles:    5,
    entities:    100,
    highlighted: false,
    prices: {
      monthly: {
        amount:  14.99,
        priceId: process.env.STRIPE_PRICE_FAMILLE_MONTHLY!,
      },
      yearly: {
        amount:  143.90,
        priceId: process.env.STRIPE_PRICE_FAMILLE_YEARLY!,
        saving:  '20%',
      },
    },
    features: [
      { label: '5 profils indépendants',         included: true },
      { label: "100 entités partagées",          included: true },
      { label: 'Badge QR multi-support',         included: true },
      { label: 'Trust Circle pool : 100 identités', included: true },
      { label: 'Protection des mineurs',         included: true },
      { label: 'Alertes fraude familiales',      included: true },
      { label: 'Support prioritaire',            included: true },
    ],
  },
  {
    id:          'FAMILLE_PLUS',
    name:        'Famille+',
    profiles:    10,
    entities:    300,
    highlighted: false,
    prices: {
      monthly: {
        amount:  24.99,
        priceId: process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY!,
      },
      yearly: {
        amount:  239.90,
        priceId: process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY!,
        saving:  '20%',
      },
    },
    features: [
      { label: '10 profils indépendants',          included: true },
      { label: "300 entités partagées",            included: true },
      { label: 'Badge QR multi-support',           included: true },
      { label: 'Trust Circle pool : 300 identités', included: true },
      { label: 'Protection des mineurs avancée',   included: true },
      { label: 'Alertes multi-niveaux',            included: true },
      { label: 'Support prioritaire 24h',          included: true },
      { label: 'Accès API en lecture',             included: true },
    ],
  },
] as const

export const PLANS_B2B = [
  {
    id:          'STARTER',
    name:        'Starter',
    users:       '1-3 utilisateurs',
    highlighted: false,
    prices: {
      monthly: {
        amount:  29,
        priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
      },
      yearly: {
        amount:  278.40,
        priceId: process.env.STRIPE_PRICE_STARTER_YEARLY!,
        saving:  '20%',
      },
    },
    features: [
      { label: '1 à 3 utilisateurs',            included: true },
      { label: 'Badge multi-support par poste', included: true },
      { label: 'Trust Circle : 40 entités',     included: true },
      { label: 'Alertes fraude basiques',        included: true },
      { label: 'Support email',                  included: true },
    ],
  },
  {
    id:          'TEAM',
    name:        'Team',
    users:       '4-10 utilisateurs',
    highlighted: true,
    prices: {
      monthly: {
        amount:  79,
        priceId: process.env.STRIPE_PRICE_TEAM_MONTHLY!,
      },
      yearly: {
        amount:  758.40,
        priceId: process.env.STRIPE_PRICE_TEAM_YEARLY!,
        saving:  '20%',
      },
    },
    features: [
      { label: '4 à 10 utilisateurs',           included: true },
      { label: 'Badge multi-support par poste', included: true },
      { label: 'Trust Circle : 150 entités',    included: true },
      { label: 'Alertes fraude avancées',        included: true },
      { label: 'Tableau de bord équipe',         included: true },
      { label: 'Support prioritaire',            included: true },
    ],
  },
  {
    id:          'BUSINESS',
    name:        'Business',
    users:       '11-50 utilisateurs',
    highlighted: false,
    prices: {
      monthly: {
        amount:  199,
        priceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
      },
      yearly: {
        amount:  1910.40,
        priceId: process.env.STRIPE_PRICE_BUSINESS_YEARLY!,
        saving:  '20%',
      },
    },
    features: [
      { label: '11 à 50 utilisateurs',          included: true },
      { label: 'Badge multi-support par poste', included: true },
      { label: 'Trust Circle : 500 entités',    included: true },
      { label: 'API entreprise',                 included: true },
      { label: 'Tableau de bord analytique',    included: true },
      { label: 'Support dédié',                  included: true },
    ],
  },
  {
    id:          'ENTERPRISE',
    name:        'Enterprise',
    users:       '51+ utilisateurs',
    highlighted: false,
    prices:      null,
    features: [
      { label: 'Utilisateurs illimités',        included: true },
      { label: 'Déploiement sur site possible', included: true },
      { label: 'SSO / SAML',                    included: true },
      { label: 'SLA garanti 99,9%',             included: true },
      { label: 'Account manager dédié',         included: true },
      { label: 'Audit sécurité inclus',         included: true },
    ],
  },
] as const

export type PlanB2C = (typeof PLANS_B2C)[number]
export type PlanB2B = (typeof PLANS_B2B)[number]

/** Tous les Price IDs valides (mensuel + annuel) pour B2C et B2B (hors Enterprise). */
export function getAllValidPriceIds(): string[] {
  const ids: string[] = []
  for (const plan of PLANS_B2C) {
    if (plan.prices.monthly.priceId) ids.push(plan.prices.monthly.priceId)
    if (plan.prices.yearly.priceId) ids.push(plan.prices.yearly.priceId)
  }
  for (const plan of PLANS_B2B) {
    if (plan.prices) {
      if (plan.prices.monthly.priceId) ids.push(plan.prices.monthly.priceId)
      if (plan.prices.yearly.priceId) ids.push(plan.prices.yearly.priceId)
    }
  }
  return ids.filter(Boolean)
}

/** Retourne le planId (B2C ou B2B) associé à un priceId, ou null. */
export function getPlanIdFromPriceId(priceId: string): string | null {
  for (const plan of PLANS_B2C) {
    if (plan.prices.monthly.priceId === priceId || plan.prices.yearly.priceId === priceId) return plan.id
  }
  for (const plan of PLANS_B2B) {
    if (plan.prices?.monthly.priceId === priceId || plan.prices?.yearly.priceId === priceId) return plan.id
  }
  return null
}

export function isValidPriceId(priceId: string): boolean {
  return getAllValidPriceIds().includes(priceId)
}
