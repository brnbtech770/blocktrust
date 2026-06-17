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
      { name: "Vérification d'identité", included: false },
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

/** Badge affiché sur le toggle annuel /pricing. */
export const YEARLY_DISCOUNT_LABEL = "-20%";

type PlanWithPrices = {
  prices: {
    monthly: { amount: number; priceId?: string };
    yearly: {
      amount: number;
      perMonth: number;
      priceId?: string;
      saving?: string;
      savingEur?: number;
    };
  } | null;
};

/** Montant mensuel affiché (TTC/HT) pour un plan payant et un cycle donné. */
export function getPlanPerMonthAmount(
  plan: PlanWithPrices,
  interval: BillingInterval,
): number | null {
  if (!plan.prices) return null;
  const priceInfo = plan.prices[interval];
  if (interval === "yearly" && priceInfo && "perMonth" in priceInfo) {
    return priceInfo.perMonth;
  }
  return priceInfo?.amount ?? null;
}

/** PriceId Stripe pour un plan payant et un cycle donné. */
export function getPlanPriceId(
  plan: PlanWithPrices,
  interval: BillingInterval,
): string | undefined {
  if (!plan.prices) return undefined;
  return plan.prices[interval]?.priceId;
}

/** Id plan catalogue (B2C_/B2B_ retirés, majuscules). */
function resolveCatalogPlanId(planId: string): string {
  return planId
    .trim()
    .toUpperCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^B2[CB]_/, "");
}

/** Prix mensuel catalogue (EUR) ; null si plan gratuit ou Enterprise sur devis. */
export function getPlanMonthlyAmountEur(planId: string): number | null {
  const key = resolveCatalogPlanId(planId);
  const b2c = getPlanB2CById(key);
  if (b2c?.prices?.monthly?.amount != null) return b2c.prices.monthly.amount;
  const b2b = getPlanB2BById(key);
  if (b2b?.prices?.monthly?.amount != null) return b2b.prices.monthly.amount;
  return null;
}

/** Libellé prix mensuel depuis la grille — ex. « 6,99€/mois », « 12,99€ HT/mois ». */
export function formatPlanMonthlyPriceLabel(planId: string): string | null {
  const key = resolveCatalogPlanId(planId);
  if (key === "ENTERPRISE") return "Sur devis";
  const amount = getPlanMonthlyAmountEur(key);
  if (amount == null) return null;
  const isB2b = getPlanB2BById(key) != null;
  return `${formatPriceFr(amount)}€${isB2b ? " HT" : ""}/mois`;
}

export type PlanB2C = (typeof PLANS_B2C)[number];
export type PlanB2B = (typeof PLANS_B2B)[number];

/** Bénéfices courts affichés sur les cartes /pricing (B2C). */
export const PRICING_CARD_BENEFITS_B2C: Record<
  PlanB2C["id"],
  readonly string[]
> = {
  DISCOVERY: ["Badge d'identité", "5 contacts", "20 vérifications/mois"],
  ESSENTIEL: [
    "Badge ancré blockchain",
    "20 contacts",
    "500 vérifications/mois",
  ],
  PREMIUM: [
    "Cercle de confiance",
    "Signatures BIS",
    "100 contacts",
    "Vérifications illimitées",
  ],
  FAMILLE: [
    "Jusqu'à 5 profils",
    "200 contacts partagés",
    "Vérifications illimitées",
  ],
};

/** Bénéfices courts affichés sur les cartes /pricing (B2B). */
export const PRICING_CARD_BENEFITS_B2B: Record<
  PlanB2B["id"],
  readonly string[]
> = {
  STARTER: [
    "1 utilisateur",
    "Badge certifié + ancrage",
    "100 contacts",
    "Signatures BIS",
  ],
  TEAM: [
    "2-10 utilisateurs",
    "Vault d'équipe illimité",
    "Audit logs",
    "Signatures BIS",
  ],
  ENTERPRISE: [
    "SSO/SAML",
    "API",
    "Marque blanche",
    "Support dédié",
  ],
};

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
export const LANDING_CTA_B2C_LABEL = "Voir les tarifs";

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
  if (isLegacyPriceId(priceId)) return null;
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

// ============================================================
// LEGACY — plans retirés de la vente (juin 2026)
// Rétro-compat abonnés existants uniquement (webhook, auth, MRR admin).
// Jamais acceptés au checkout — voir isValidPriceId / create-checkout.
// ============================================================

/** IDs de plans retirés de la grille de vente (enum Prisma inchangé). */
export const LEGACY_PLAN_IDS = ["FAMILLE_PLUS", "SOLO_PRO", "BUSINESS"] as const;

/** Plans assignables manuellement par l’admin (grille juin 2026 — hors legacy). */
export const ADMIN_ASSIGNABLE_PLAN_CODES = [
  ...PLANS_B2C.filter((p) => !p.isFree).map((p) => p.id),
  ...PLANS_B2B.map((p) => p.id),
] as const;

export type AdminAssignablePlanCode = (typeof ADMIN_ASSIGNABLE_PLAN_CODES)[number];

/** Price IDs Stripe legacy (env) — Famille+, Solo Pro, Business. Non souscriptibles. */
export function getLegacyStripePriceIds(): string[] {
  const ids = [
    process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY,
    process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY,
    process.env.STRIPE_PRICE_SOLO_PRO_MONTHLY,
    process.env.STRIPE_PRICE_SOLO_PRO_YEARLY,
    process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  ];
  return ids.filter((id): id is string => Boolean(id && id.length > 0));
}

/** True si le priceId correspond à un plan legacy (checkout interdit). */
export function isLegacyPriceId(priceId: string): boolean {
  return getLegacyStripePriceIds().includes(priceId);
}

export function isValidPriceId(priceId: string): boolean {
  if (isLegacyPriceId(priceId)) return false;
  return getAllValidPriceIds().includes(priceId);
}

// ============================================================
// QUOTAS — SOURCE DE VÉRITÉ UNIQUE (SYS-3)
// Toutes les limites (contacts, vérifications, Trust Circle) dérivent de cette
// table. checkQuota / verify-quotas / trustCircleQuota la consomment : aucune
// valeur de quota ne doit être codée en dur ailleurs.
//   - contacts            : nombre d'entités/contacts enregistrables.
//   - verificationsPerMonth : vérifications mensuelles (Infinity = illimité).
//   - trustCirclePool     : pool de relations Trust Circle (null = illimité, 0 = indisponible).
// ============================================================

export const INFINITE_QUOTA = Number.POSITIVE_INFINITY;

export type PlanQuota = {
  contacts: number;
  verificationsPerMonth: number;
  trustCirclePool: number | null;
};

/** Clé courte normalisée (sans préfixe B2C_/B2B_, majuscules). */
export function normalizePlanQuotaKey(plan?: string | null): string {
  return (plan ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^B2[CB]_/, "");
}

/**
 * Table canonique des quotas par plan. Valeurs alignées sur la grille de vente
 * ci-dessus ; Trust Circle indisponible (pool 0) sous Premium (cf. SYS-2).
 */
export const PLAN_QUOTAS: Record<string, PlanQuota> = {
  DISCOVERY: { contacts: 5, verificationsPerMonth: 20, trustCirclePool: 0 },
  DISCOVERY_EXPIRED: { contacts: 0, verificationsPerMonth: 0, trustCirclePool: 0 },
  ESSENTIEL: { contacts: 20, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 0 },
  PREMIUM: { contacts: 100, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 40 },
  FAMILLE: { contacts: 200, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 80 },
  FAMILLE_PLUS: { contacts: 300, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 200 },
  SOLO_PRO: { contacts: 100, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 100 },
  STARTER: { contacts: 500, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 500 },
  TEAM: { contacts: 3000, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 3000 },
  BUSINESS: { contacts: 25000, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: 25000 },
  ENTERPRISE: { contacts: 999999, verificationsPerMonth: INFINITE_QUOTA, trustCirclePool: null },
};

/** Plan inconnu → Découverte (fail-safe : jamais de droits payants par défaut). */
function planQuotaOrDiscovery(plan?: string | null): PlanQuota {
  return PLAN_QUOTAS[normalizePlanQuotaKey(plan)] ?? PLAN_QUOTAS.DISCOVERY;
}

/** Nombre maximum de contacts/entités enregistrables pour le plan. */
export function getMaxContacts(plan?: string | null): number {
  return planQuotaOrDiscovery(plan).contacts;
}

/** Vérifications mensuelles autorisées (Infinity = illimité). */
export function getMaxVerifications(plan?: string | null): number {
  return planQuotaOrDiscovery(plan).verificationsPerMonth;
}

/** Pool Trust Circle (null = illimité, 0 = indisponible). */
export function getMaxTrustCircle(plan?: string | null): number | null {
  return planQuotaOrDiscovery(plan).trustCirclePool;
}
