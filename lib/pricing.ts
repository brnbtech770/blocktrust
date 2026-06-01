// lib/pricing.ts
// Grille tarifaire finale (1er juin 2026) — 4 plans B2C + 3 plans B2B.
// Le plan Découverte est GRATUIT : aucun priceId Stripe, isFree = true,
// il ne déclenche JAMAIS de checkout Stripe.
// ============================================================

export type BillingInterval = "monthly" | "yearly";

/** Détail complet dans l’accordion « Voir le détail ». */
export type PlanAccordionFeature = {
  name: string;
  included: boolean;
  value?: string;
};

// PLANS_B2C / PLANS_B2B sont déclarés `as const` : les types PlanB2C / PlanB2B
// sont dérivés. Un plan gratuit a `prices: null` + `isFree: true`. L'UI et les
// helpers ci-dessous gèrent explicitement ce cas (pas d'accès direct non gardé).

export const PLANS_B2C = [
  {
    id: "DISCOVERY",
    name: "Découverte",
    profiles: 1,
    entities: 5,
    highlighted: false,
    isFree: true,
    prices: null,
    features: [
      { label: "1 profil", included: true },
      { label: "Badge multi-support (preview, non ancré)", included: true },
      { label: "5 contacts de confiance", included: true },
      { label: "20 vérifications/mois", included: true },
      { label: "30 jours de découverte", included: true },
    ],
    accordionFeatures: [
      { name: "Profils", included: true, value: "1" },
      { name: "Contacts de confiance", included: true, value: "5" },
      { name: "Vérifications", included: true, value: "20 / mois" },
      { name: "Badge multi-support", included: true, value: "Preview — non ancré blockchain" },
      { name: "Période de découverte", included: true, value: "30 jours" },
      { name: "Ancrage Polygon", included: false },
      { name: "Réseau de confiance certifié (Trust Circle)", included: false },
      { name: "Vérification d'identité (KYC)", included: false },
    ],
  },
  {
    id: "ESSENTIEL",
    name: "Essentiel",
    profiles: 1,
    entities: 20,
    highlighted: false,
    isFree: false,
    prices: {
      monthly: {
        amount: 3.99,
        priceId: process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY,
      },
      yearly: {
        amount: 35.88,
        perMonth: 2.99,
        savingEur: 12,
        priceId: process.env.STRIPE_PRICE_ESSENTIEL_YEARLY,
      },
    },
    features: [
      { label: "1 profil certifié", included: true },
      { label: "Badge ancré blockchain Polygon", included: true },
      { label: "Jusqu'à 20 contacts", included: true },
      { label: "500 vérifications/mois", included: true },
      { label: "Vérifications illimitées 6 mois (lancement)", included: true },
    ],
    accordionFeatures: [
      { name: "Profils certifiés", included: true, value: "1" },
      { name: "Contacts", included: true, value: "20 contacts enregistrables" },
      { name: "Vérifications", included: true, value: "500 / mois (illimité 6 mois lancement)" },
      { name: "Badge certifié", included: true },
      { name: "QR rotatif", included: true },
      { name: "Ancrage Polygon", included: true },
      { name: "Réseau de confiance certifié (Trust Circle)", included: false, value: "Disponible en Premium" },
      { name: "White Label", included: false },
    ],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    profiles: 1,
    entities: 100,
    highlighted: true,
    isFree: false,
    prices: {
      monthly: {
        amount: 6.99,
        priceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
      },
      yearly: {
        amount: 59.88,
        perMonth: 4.99,
        savingEur: 24,
        priceId: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
      },
    },
    features: [
      { label: "1 profil certifié", included: true },
      { label: "Badge ancré blockchain Polygon", included: true },
      { label: "Réseau de confiance (Trust Circle)", included: true },
      { label: "Jusqu'à 100 contacts", included: true },
      { label: "Vérifications illimitées", included: true },
    ],
    accordionFeatures: [
      { name: "Profils certifiés", included: true, value: "1" },
      { name: "Contacts", included: true, value: "100 contacts enregistrables" },
      { name: "Vérifications illimitées*", included: true },
      { name: "Badge certifié", included: true },
      { name: "QR rotatif", included: true },
      { name: "Ancrage Polygon", included: true },
      { name: "Réseau de confiance certifié (Trust Circle)", included: true },
      { name: "White Label", included: false },
    ],
  },
  {
    id: "FAMILLE",
    name: "Famille",
    profiles: 5,
    entities: 200,
    highlighted: false,
    isFree: false,
    prices: {
      monthly: {
        amount: 17.99,
        priceId: process.env.STRIPE_PRICE_FAMILLE_MONTHLY,
      },
      yearly: {
        amount: 179.88,
        perMonth: 14.99,
        savingEur: 36,
        priceId: process.env.STRIPE_PRICE_FAMILLE_YEARLY,
      },
    },
    features: [
      { label: "Jusqu'à 5 profils inclus", included: true },
      { label: "Profils supplémentaires : 2,99€/mois (max 10)", included: true },
      { label: "200 contacts partagés + 50/profil", included: true },
      { label: "Réseau de confiance (Trust Circle)", included: true },
      { label: "1 admin · Vérifications illimitées", included: true },
    ],
    accordionFeatures: [
      { name: "Profils certifiés", included: true, value: "5 inclus (jusqu'à 10)" },
      { name: "Profils supplémentaires", included: true, value: "2,99€/mois — max 10" },
      { name: "Contacts", included: true, value: "200 partagés + 50 / profil" },
      { name: "Vérifications illimitées*", included: true },
      { name: "Administrateur", included: true, value: "1 admin" },
      { name: "Ancrage Polygon", included: true },
      { name: "Réseau de confiance certifié (Trust Circle)", included: true },
      { name: "White Label", included: false },
    ],
  },
] as const;

/** Montant formaté « 3,99 » (séparateur virgule FR). */
export function formatPriceFr(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PlanB2C = (typeof PLANS_B2C)[number];
export type PlanB2B = (typeof PLANS_B2B)[number];

/** Plan B2C par id (ou undefined). */
export function getPlanB2CById(id: string): PlanB2C | undefined {
  return PLANS_B2C.find((p) => p.id === id);
}

/** Plan B2B par id (ou undefined). */
export function getPlanB2BById(id: string): PlanB2B | undefined {
  return PLANS_B2B.find((p) => p.id === id);
}

/** Prix mensuel Essentiel (EUR TTC) — source unique pour textes marketing. */
export const ESSENTIEL_MONTHLY_EUR = 3.99;

/** CTA landing section particuliers → /pricing */
export const LANDING_CTA_B2C_LABEL = `Démarrer à partir de ${formatPriceFr(ESSENTIEL_MONTHLY_EUR)}€ TTC/mois`;

/** Invitations / renvois forfait entrée B2C */
export const JOIN_BLOCKTRUST_ESSENTIEL_LABEL = `Rejoindre BLOCKTRUST — ${formatPriceFr(ESSENTIEL_MONTHLY_EUR)}€ TTC/mois`;

export const PLANS_B2B = [
  {
    id: "STARTER",
    name: "Starter",
    users: "1 utilisateur",
    highlighted: false,
    prices: {
      monthly: {
        amount: 12.99,
        priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      },
      yearly: {
        amount: 119.88,
        perMonth: 9.99,
        saving: "20%",
        priceId: process.env.STRIPE_PRICE_STARTER_YEARLY,
      },
    },
    features: [
      { label: "1 utilisateur", included: true },
      { label: "100 contacts", included: true },
      { label: "500 vérifications/mois", included: true },
      { label: "Réseau de confiance (Trust Circle)", included: true },
      { label: "Badge ancré blockchain Polygon", included: true },
    ],
    accordionFeatures: [
      { name: "Utilisateurs", included: true, value: "1" },
      { name: "Contacts", included: true, value: "100 enregistrables" },
      { name: "Vérifications", included: true, value: "500 / mois" },
      { name: "Réseau de confiance certifié (Trust Circle)", included: true },
      { name: "Ancrage blockchain Polygon", included: true },
      { name: "Facturation HT (TVA déductible)", included: true },
      { name: "White Label (en option)", included: false, value: "Sur demande" },
      { name: "API publique", included: false, value: "En option" },
    ],
  },
  {
    id: "TEAM",
    name: "Team",
    users: "Jusqu'à 10 utilisateurs",
    highlighted: true,
    prices: {
      monthly: {
        amount: 8.99,
        priceId: process.env.STRIPE_PRICE_TEAM_MONTHLY,
      },
      yearly: {
        amount: 83.88,
        perMonth: 6.99,
        saving: "20%",
        priceId: process.env.STRIPE_PRICE_TEAM_YEARLY,
      },
    },
    features: [
      { label: "Jusqu'à 10 utilisateurs (dès 17,98€)", included: true },
      { label: "Vault partagé illimité + 100/user", included: true },
      { label: "2500 vérifications/mois mutualisées", included: true },
      { label: "Gestion des rôles", included: true },
      { label: "Audit logs", included: true },
    ],
    accordionFeatures: [
      { name: "Utilisateurs", included: true, value: "Jusqu'à 10 (dès 2 — 17,98€)" },
      { name: "Vault partagé", included: true, value: "Illimité + 100 / utilisateur" },
      { name: "Vérifications mutualisées", included: true, value: "2500 / mois" },
      { name: "Gestion des rôles", included: true },
      { name: "Audit logs", included: true },
      { name: "Réseau de confiance certifié (Trust Circle)", included: true },
      { name: "White Label (en option)", included: false, value: "Sur demande" },
      { name: "SSO / SAML (en option)", included: false, value: "Sur demande" },
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    users: "Sur mesure",
    highlighted: false,
    prices: null,
    features: [
      { label: "Tout Team inclus", included: true },
      { label: "Vérifications illimitées + SLA", included: true },
      { label: "White Label, API, SSO/SAML (options)", included: true },
      { label: "Audit logs avancés", included: true },
      { label: "Support dédié", included: true },
    ],
    accordionFeatures: [
      { name: "Tarification", included: true, value: "Sur devis" },
      { name: "Tout Team inclus", included: true },
      { name: "Vérifications illimitées + SLA", included: true },
      { name: "White Label (en option)", included: true },
      { name: "API publique (en option)", included: true },
      { name: "SSO / SAML (en option)", included: true },
      { name: "Audit logs avancés", included: true },
      { name: "Support dédié", included: true },
    ],
  },
] as const;

/** Starter — EUR HT / utilisateur / mois (référence produit landing). */
export const STARTER_MONTHLY_PER_USER_HT_EUR = 12.99;

/** Starter — EUR HT / utilisateur / mois en engagement annuel (référence landing). */
export const STARTER_YEARLY_PER_USER_HT_EUR = 9.99;

/** CTA landing section entreprises → /pricing?tab=entreprises */
export const LANDING_CTA_B2B_LABEL = `Starter · ${formatPriceFr(STARTER_YEARLY_PER_USER_HT_EUR)}€ HT/user/mois`;

/** Tous les Price IDs valides (mensuel + annuel) pour B2C et B2B (hors plans gratuits / Enterprise). */
export function getAllValidPriceIds(): string[] {
  const ids: string[] = [];
  for (const plan of PLANS_B2C) {
    if (!plan.prices) continue;
    if (plan.prices.monthly.priceId) ids.push(plan.prices.monthly.priceId);
    if (plan.prices.yearly.priceId) ids.push(plan.prices.yearly.priceId);
  }
  for (const plan of PLANS_B2B) {
    if (!plan.prices) continue;
    if (plan.prices.monthly.priceId) ids.push(plan.prices.monthly.priceId);
    if (plan.prices.yearly.priceId) ids.push(plan.prices.yearly.priceId);
  }
  return ids.filter(Boolean) as string[];
}

/** Retourne le planId (B2C ou B2B) associé à un priceId, ou null. */
export function getPlanIdFromPriceId(priceId: string): string | null {
  for (const plan of PLANS_B2C) {
    if (!plan.prices) continue;
    if (
      plan.prices.monthly.priceId === priceId ||
      plan.prices.yearly.priceId === priceId
    )
      return plan.id;
  }
  for (const plan of PLANS_B2B) {
    if (!plan.prices) continue;
    if (
      plan.prices.monthly.priceId === priceId ||
      plan.prices.yearly.priceId === priceId
    )
      return plan.id;
  }
  return null;
}

export function isValidPriceId(priceId: string): boolean {
  return getAllValidPriceIds().includes(priceId);
}
