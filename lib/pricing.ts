// lib/pricing.ts
// Plans B2C & B2B — Price IDs mensuel ET annuel (Stripe)
// ============================================================

export type BillingInterval = "monthly" | "yearly";

/** Détail complet dans l’accordion « Voir le détail ». */
export type PlanAccordionFeature = {
  name: string;
  included: boolean;
  value?: string;
};

export const PLANS_B2C = [
  {
    id: "ESSENTIEL",
    name: "Essentiel",
    profiles: 1,
    entities: 20,
    highlighted: false,
    prices: {
      monthly: {
        amount: 4.99,
        priceId: process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY!,
      },
      yearly: {
        amount: 47.9,
        priceId: process.env.STRIPE_PRICE_ESSENTIEL_YEARLY!,
        saving: "20%",
      },
    },
    features: [
      { label: "1 profil certifié", included: true },
      { label: "Jusqu'à 20 contacts", included: true },
      { label: "10 vérifications / mois", included: true },
      { label: "Badge QR multi-support", included: true },
      { label: "Ancrage blockchain Polygon", included: true },
    ],
    accordionFeatures: [
      { name: "Profils certifiés", included: true, value: "1" },
      { name: "Contacts", included: true, value: "20" },
      { name: "Vérifications / mois", included: true, value: "10" },
      { name: "Badge certifié", included: true },
      { name: "QR rotatif", included: true },
      { name: "Ancrage Polygon", included: true },
      { name: "Trust Circle", included: false },
      { name: "White Label", included: false },
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    profiles: 1,
    entities: 100,
    highlighted: true,
    prices: {
      monthly: {
        amount: 9.99,
        priceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY!,
      },
      yearly: {
        amount: 95.9,
        priceId: process.env.STRIPE_PRICE_PREMIUM_YEARLY!,
        saving: "20%",
      },
    },
    features: [
      { label: "1 profil certifié", included: true },
      { label: "Jusqu'à 100 contacts", included: true },
      { label: "50 vérifications / mois", included: true },
      { label: "Badge QR multi-support", included: true },
      { label: "Ancrage blockchain Polygon", included: true },
      { label: "Trust Circle (50 contacts)", included: true },
    ],
    accordionFeatures: [
      { name: "Profils certifiés", included: true, value: "1" },
      { name: "Contacts", included: true, value: "100" },
      { name: "Vérifications / mois", included: true, value: "50" },
      { name: "Badge certifié", included: true },
      { name: "QR rotatif", included: true },
      { name: "Ancrage Polygon", included: true },
      { name: "Trust Circle", included: true, value: "50 contacts" },
      { name: "White Label", included: false },
    ],
  },
  {
    id: "FAMILLE",
    name: "Famille",
    profiles: 5,
    entities: 100,
    highlighted: false,
    prices: {
      monthly: {
        amount: 14.99,
        priceId: process.env.STRIPE_PRICE_FAMILLE_MONTHLY!,
      },
      yearly: {
        amount: 143.9,
        priceId: process.env.STRIPE_PRICE_FAMILLE_YEARLY!,
        saving: "20%",
      },
    },
    features: [
      { label: "5 profils indépendants", included: true },
      { label: "100 contacts partagés", included: true },
      { label: "100 vérifications / mois", included: true },
      { label: "Badge QR multi-support", included: true },
      { label: "Ancrage blockchain Polygon", included: true },
      { label: "Trust Circle", included: true },
    ],
    accordionFeatures: [
      { name: "Profils certifiés", included: true, value: "5" },
      { name: "Contacts", included: true, value: "100" },
      { name: "Vérifications / mois", included: true, value: "100" },
      { name: "Badge certifié", included: true },
      { name: "QR rotatif", included: true },
      { name: "Ancrage Polygon", included: true },
      { name: "Trust Circle", included: true },
      { name: "White Label", included: false },
    ],
  },
  {
    id: "FAMILLE_PLUS",
    name: "Famille+",
    profiles: 10,
    entities: 300,
    highlighted: false,
    prices: {
      monthly: {
        amount: 24.99,
        priceId: process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY!,
      },
      yearly: {
        amount: 239.9,
        priceId: process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY!,
        saving: "20%",
      },
    },
    features: [
      { label: "10 profils indépendants", included: true },
      { label: "300 contacts partagés", included: true },
      { label: "300 vérifications / mois", included: true },
      { label: "Badge QR multi-support", included: true },
      { label: "Ancrage blockchain Polygon", included: true },
      { label: "Trust Circle (300 contacts)", included: true },
    ],
    accordionFeatures: [
      { name: "Profils certifiés", included: true, value: "10" },
      { name: "Contacts", included: true, value: "300" },
      { name: "Vérifications / mois", included: true, value: "300" },
      { name: "Badge certifié", included: true },
      { name: "QR rotatif", included: true },
      { name: "Ancrage Polygon", included: true },
      { name: "Trust Circle", included: true, value: "300 contacts" },
      { name: "White Label", included: false },
    ],
  },
] as const;

export const PLANS_B2B = [
  {
    id: "STARTER",
    name: "Starter",
    users: "1-3 utilisateurs",
    highlighted: false,
    prices: {
      monthly: {
        amount: 29,
        priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY!,
      },
      yearly: {
        amount: 278.4,
        priceId: process.env.STRIPE_PRICE_STARTER_YEARLY!,
        saving: "20%",
      },
    },
    features: [
      { label: "Jusqu'à 3 utilisateurs", included: true },
      { label: "200 vérifications / mois", included: true },
      { label: "Badge multi-support par poste", included: true },
      { label: "White Label", included: true },
      { label: "API publique", included: true },
      { label: "Trust Circle", included: true },
      { label: "Webhooks", included: true },
    ],
    accordionFeatures: [
      { name: "Utilisateurs", included: true, value: "3" },
      { name: "Vérifications / mois", included: true, value: "200" },
      { name: "White Label", included: true },
      { name: "API publique", included: true },
      { name: "Trust Circle", included: true },
      { name: "Webhooks", included: true },
      { name: "SSO / SAML", included: false },
      { name: "Support dédié", included: false },
    ],
  },
  {
    id: "TEAM",
    name: "Team",
    users: "4-10 utilisateurs",
    highlighted: true,
    prices: {
      monthly: {
        amount: 79,
        priceId: process.env.STRIPE_PRICE_TEAM_MONTHLY!,
      },
      yearly: {
        amount: 758.4,
        priceId: process.env.STRIPE_PRICE_TEAM_YEARLY!,
        saving: "20%",
      },
    },
    features: [
      { label: "Jusqu'à 10 utilisateurs", included: true },
      { label: "500 vérifications / mois", included: true },
      { label: "Badge multi-support par poste", included: true },
      { label: "White Label", included: true },
      { label: "API publique", included: true },
      { label: "Trust Circle", included: true },
      { label: "Webhooks", included: true },
    ],
    accordionFeatures: [
      { name: "Utilisateurs", included: true, value: "10" },
      { name: "Vérifications / mois", included: true, value: "500" },
      { name: "White Label", included: true },
      { name: "API publique", included: true },
      { name: "Trust Circle", included: true },
      { name: "Webhooks", included: true },
      { name: "SSO / SAML", included: false },
      { name: "Support dédié", included: false },
    ],
  },
  {
    id: "BUSINESS",
    name: "Business",
    users: "11-50 utilisateurs",
    highlighted: false,
    prices: {
      monthly: {
        amount: 199,
        priceId: process.env.STRIPE_PRICE_BUSINESS_MONTHLY!,
      },
      yearly: {
        amount: 1910.4,
        priceId: process.env.STRIPE_PRICE_BUSINESS_YEARLY!,
        saving: "20%",
      },
    },
    features: [
      { label: "Jusqu'à 50 utilisateurs", included: true },
      { label: "Vérifications illimitées", included: true },
      { label: "Badge multi-support par poste", included: true },
      { label: "White Label", included: true },
      { label: "API publique", included: true },
      { label: "Trust Circle", included: true },
      { label: "Webhooks", included: true },
      { label: "Support prioritaire", included: true },
    ],
    accordionFeatures: [
      { name: "Utilisateurs", included: true, value: "50" },
      { name: "Vérifications / mois", included: true, value: "Illimité" },
      { name: "White Label", included: true },
      { name: "API publique", included: true },
      { name: "Trust Circle", included: true },
      { name: "Webhooks", included: true },
      { name: "Support prioritaire", included: true },
      { name: "SSO / SAML", included: false },
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    users: "51+ utilisateurs",
    highlighted: false,
    prices: null,
    features: [
      { label: "Tarification sur devis", included: true },
      { label: "Tout inclus", included: true },
      { label: "SSO / SAML", included: true },
      { label: "Support dédié", included: true },
      { label: "SLA garanti", included: true },
    ],
    accordionFeatures: [
      { name: "Tarification", included: true, value: "Sur devis" },
      { name: "Tout inclus", included: true },
      { name: "SSO / SAML", included: true },
      { name: "Support dédié", included: true },
      { name: "SLA garanti", included: true },
    ],
  },
] as const;

export type PlanB2C = (typeof PLANS_B2C)[number];
export type PlanB2B = (typeof PLANS_B2B)[number];

/** Tous les Price IDs valides (mensuel + annuel) pour B2C et B2B (hors Enterprise). */
export function getAllValidPriceIds(): string[] {
  const ids: string[] = [];
  for (const plan of PLANS_B2C) {
    if (plan.prices.monthly.priceId) ids.push(plan.prices.monthly.priceId);
    if (plan.prices.yearly.priceId) ids.push(plan.prices.yearly.priceId);
  }
  for (const plan of PLANS_B2B) {
    if (plan.prices) {
      if (plan.prices.monthly.priceId) ids.push(plan.prices.monthly.priceId);
      if (plan.prices.yearly.priceId) ids.push(plan.prices.yearly.priceId);
    }
  }
  return ids.filter(Boolean);
}

/** Retourne le planId (B2C ou B2B) associé à un priceId, ou null. */
export function getPlanIdFromPriceId(priceId: string): string | null {
  for (const plan of PLANS_B2C) {
    if (
      plan.prices.monthly.priceId === priceId ||
      plan.prices.yearly.priceId === priceId
    )
      return plan.id;
  }
  for (const plan of PLANS_B2B) {
    if (
      plan.prices?.monthly.priceId === priceId ||
      plan.prices?.yearly.priceId === priceId
    )
      return plan.id;
  }
  return null;
}

export function isValidPriceId(priceId: string): boolean {
  return getAllValidPriceIds().includes(priceId);
}
