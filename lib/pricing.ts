/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
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
      { label: "1 profil", included: true },
      { label: "Badge multi-support (PC · Mobile · Tablette)", included: true },
      { label: "Vérifications illimitées †", included: true },
      { label: "20 contacts de confiance", included: true },
      { label: "Ancrage Polygon", included: true },
      { label: "Trust Circle disponible en Premium", included: false },
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
      { label: "1 profil", included: true },
      { label: "Badge multi-support (PC · Mobile · Tablette)", included: true },
      { label: "Trust Circle", included: true },
      { label: "Vérifications illimitées †", included: true },
      { label: "100 contacts de confiance", included: true },
      { label: "Ancrage Polygon", included: true },
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
      { label: "5 profils inclus — ajout jusqu'à 5 profils supplémentaires", included: true },
      { label: "Badge multi-support (PC · Mobile · Tablette)", included: true },
      { label: "Trust Circle", included: true },
      { label: "200 contacts partagés — accessibles à tous les profils", included: true },
      { label: "50 contacts personnels par profil", included: true },
      { label: "1 profil administrateur — gestion des membres et des accès", included: true },
      { label: "Vérifications illimitées †", included: true },
      { label: "Ancrage Polygon", included: true },
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
      { label: "Badge multi-support (PC · Mobile · Tablette)", included: true },
      { label: "100 contacts de confiance", included: true },
      { label: "500 vérifications/mois", included: true },
      { label: "Trust Circle", included: true },
      { label: "Ancrage Polygon", included: true },
      { label: "Fonctionnalités avancées sur devis", included: true },
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
      { label: "Badge multi-support (PC · Mobile · Tablette)", included: true },
      { label: "Trust Circle", included: true },
      { label: "2 500 vérifications/mois", included: true },
      { label: "Vault partagé — contacts de confiance illimités *", included: true },
      { label: "Vault individuel — 100 contacts de confiance / utilisateur", included: true },
      { label: "Gestion des rôles et permissions", included: true },
      { label: "Ancrage Polygon", included: true },
      { label: "Audit Logs", included: true },
      { label: "Fonctionnalités avancées sur devis", included: true },
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
      { label: "Tout le plan Team", included: true },
      { label: "Fonctionnalités avancées incluses (API, Webhooks)", included: true },
      { label: "White Label", included: true },
      { label: "SSO / SAML", included: true },
      { label: "Intégrations avancées", included: true },
      { label: "SLA garanti", included: true },
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

// ============================================================
// Add-on Famille (profils supplémentaires) + sièges B2B
// ============================================================

/** Price IDs Stripe de l'add-on « profil supplémentaire » Famille (env). */
export const FAMILLE_ADDON_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_FAMILLE_ADDON_MONTHLY,
  yearly: process.env.STRIPE_PRICE_FAMILLE_ADDON_YEARLY,
} as const;

/** Add-on Famille — 2,99€/mois/profil (mensuel). */
export const FAMILLE_ADDON_MONTHLY_EUR = 2.99;
/** Add-on Famille — 29,88€/an/profil = 2,49€/mois (annuel). */
export const FAMILLE_ADDON_YEARLY_TOTAL_EUR = 29.88;
export const FAMILLE_ADDON_YEARLY_PER_MONTH_EUR = 2.49;

/** Profils inclus dans Famille + plafond total (inclus + add-on). */
export const FAMILLE_INCLUDED_PROFILES = 5;
export const FAMILLE_MAX_PROFILES = 10;
/** Nombre maximum de profils supplémentaires achetables (10 - 5). */
export const FAMILLE_ADDON_MAX = FAMILLE_MAX_PROFILES - FAMILLE_INCLUDED_PROFILES;

/** Bornes de sièges B2B Team (par utilisateur). */
export const TEAM_SEATS_MIN = 2;
export const TEAM_SEATS_MAX = 10;

/** Plans B2B facturés à l'unité (par siège). */
export function isPerSeatPlan(planId: string): boolean {
  return planId === "TEAM";
}

/** Identifiants des plans B2C (particuliers), gratuit inclus. */
const B2C_PLAN_IDS = new Set<string>(PLANS_B2C.map((p) => p.id));

/** True si le planId est un plan B2C (particulier) → soumis au droit de rétractation. */
export function isB2CPlanId(planId: string): boolean {
  return B2C_PLAN_IDS.has(planId);
}

/** Retourne le priceId add-on Famille pour le cycle, ou undefined si non configuré. */
export function getFamilleAddonPriceId(interval: BillingInterval): string | undefined {
  return FAMILLE_ADDON_PRICE_IDS[interval];
}

/** True si le priceId correspond à l'add-on Famille (mensuel ou annuel). */
export function isFamilleAddonPriceId(priceId: string): boolean {
  return (
    !!priceId &&
    (priceId === FAMILLE_ADDON_PRICE_IDS.monthly ||
      priceId === FAMILLE_ADDON_PRICE_IDS.yearly)
  );
}

/** Détermine le cycle (mensuel/annuel) d'un priceId catalogue, ou null. */
export function getIntervalFromPriceId(priceId: string): BillingInterval | null {
  for (const plan of [...PLANS_B2C, ...PLANS_B2B]) {
    if (!plan.prices) continue;
    if (plan.prices.monthly.priceId === priceId) return "monthly";
    if (plan.prices.yearly.priceId === priceId) return "yearly";
  }
  if (priceId === FAMILLE_ADDON_PRICE_IDS.monthly) return "monthly";
  if (priceId === FAMILLE_ADDON_PRICE_IDS.yearly) return "yearly";
  return null;
}

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
