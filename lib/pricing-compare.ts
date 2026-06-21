/**
 * Données du tableau comparatif /pricing#compare — prix dérivés de lib/pricing.ts.
 */
import {
  PLANS_B2C,
  PLANS_B2B,
  formatPriceFr,
  getPlanPerMonthAmount,
  FAMILLE_INCLUDED_PROFILES,
  TEAM_SEATS_MIN,
  TEAM_SEATS_MAX,
  type PlanB2C,
  type PlanB2B,
} from "@/lib/pricing";

export type CompareCell = "yes" | "no" | string;

export type ComparePlanColumn = {
  id: string;
  name: string;
  highlighted: boolean;
};

export type CompareRow = {
  label: string;
  cells: Record<string, CompareCell>;
};

export type CompareTableData = {
  plans: ComparePlanColumn[];
  rows: CompareRow[];
};

function b2cMonthlyTtc(plan: PlanB2C): CompareCell {
  if (plan.isFree) return "Gratuit";
  const amount = getPlanPerMonthAmount(plan, "monthly");
  return amount != null ? `${formatPriceFr(amount)}€` : "—";
}

function b2cYearlyTtcPerMonth(plan: PlanB2C): CompareCell {
  if (plan.isFree || !plan.prices) return "—";
  const amount = getPlanPerMonthAmount(plan, "yearly");
  return amount != null ? `${formatPriceFr(amount)}€/mois` : "—";
}

function b2bMonthlyHtUser(plan: PlanB2B): CompareCell {
  if (!plan.prices) return "Sur devis";
  const amount = getPlanPerMonthAmount(plan, "monthly");
  return amount != null ? `${formatPriceFr(amount)}€` : "—";
}

function b2bYearlyHtUser(plan: PlanB2B): CompareCell {
  if (!plan.prices) return "—";
  const amount = getPlanPerMonthAmount(plan, "yearly");
  return amount != null ? `${formatPriceFr(amount)}€` : "—";
}

function row(
  label: string,
  values: Record<string, CompareCell>,
): CompareRow {
  return { label, cells: values };
}

/** Tableau comparatif B2C (4 plans). */
export function getB2CCompareTable(): CompareTableData {
  const plans: ComparePlanColumn[] = PLANS_B2C.map((p) => ({
    id: p.id,
    name: p.name,
    highlighted: p.id === "PREMIUM",
  }));

  const ids = PLANS_B2C.map((p) => p.id);
  const byId = Object.fromEntries(PLANS_B2C.map((p) => [p.id, p])) as Record<
    string,
    PlanB2C
  >;

  const rows: CompareRow[] = [
    row(
      "Prix mensuel (TTC)",
      Object.fromEntries(ids.map((id) => [id, b2cMonthlyTtc(byId[id])])),
    ),
    row(
      "Prix annuel (TTC)",
      Object.fromEntries(ids.map((id) => [id, b2cYearlyTtcPerMonth(byId[id])])),
    ),
    row(
      "Badge certifié",
      Object.fromEntries(ids.map((id) => [id, "yes" as CompareCell])),
    ),
    row(
      "Ancrage blockchain",
      {
        DISCOVERY: "no",
        ESSENTIEL: "yes",
        PREMIUM: "yes",
        FAMILLE: "yes",
      },
    ),
    row(
      "Contacts",
      {
        DISCOVERY: "5",
        ESSENTIEL: "20",
        PREMIUM: "100",
        FAMILLE: "200 + 50/profil",
      },
    ),
    row(
      "Vérifications/mois",
      {
        DISCOVERY: "20",
        ESSENTIEL: "500",
        PREMIUM: "Illimitées",
        FAMILLE: "Illimitées",
      },
    ),
    row(
      "Trust Circle",
      {
        DISCOVERY: "no",
        ESSENTIEL: "no",
        PREMIUM: "yes",
        FAMILLE: "yes",
      },
    ),
    row(
      "Signatures BIS",
      {
        DISCOVERY: "no",
        ESSENTIEL: "no",
        PREMIUM: "yes",
        FAMILLE: "yes",
      },
    ),
    row(
      "Profils",
      {
        DISCOVERY: "1",
        ESSENTIEL: "1",
        PREMIUM: "1",
        FAMILLE: `Jusqu'à ${FAMILLE_INCLUDED_PROFILES} (+add-on)`,
      },
    ),
    row(
      "Extension Chrome",
      Object.fromEntries(ids.map((id) => [id, "yes" as CompareCell])),
    ),
  ];

  return { plans, rows };
}

/** Tableau comparatif B2B (3 plans). */
export function getB2BCompareTable(): CompareTableData {
  const plans: ComparePlanColumn[] = PLANS_B2B.map((p) => ({
    id: p.id,
    name: p.name,
    highlighted: p.id === "TEAM",
  }));

  const ids = PLANS_B2B.map((p) => p.id);
  const byId = Object.fromEntries(PLANS_B2B.map((p) => [p.id, p])) as Record<
    string,
    PlanB2B
  >;

  const rows: CompareRow[] = [
    row(
      "Prix mensuel (HT)/user",
      Object.fromEntries(ids.map((id) => [id, b2bMonthlyHtUser(byId[id])])),
    ),
    row(
      "Prix annuel (HT)/user",
      Object.fromEntries(ids.map((id) => [id, b2bYearlyHtUser(byId[id])])),
    ),
    row(
      "Utilisateurs",
      {
        STARTER: "1",
        TEAM: `${TEAM_SEATS_MIN}-${TEAM_SEATS_MAX}`,
        ENTERPRISE: "51+",
      },
    ),
    row(
      "Badge certifié + ancrage",
      Object.fromEntries(ids.map((id) => [id, "yes" as CompareCell])),
    ),
    row(
      "Contacts",
      {
        STARTER: "100",
        TEAM: "Vault illimité",
        ENTERPRISE: "Illimité",
      },
    ),
    row(
      "Vérifications/mois",
      {
        STARTER: "500",
        TEAM: "2 500",
        ENTERPRISE: "Illimitées + SLA",
      },
    ),
    row(
      "Trust Circle",
      Object.fromEntries(ids.map((id) => [id, "yes" as CompareCell])),
    ),
    row(
      "Signatures BIS",
      Object.fromEntries(ids.map((id) => [id, "yes" as CompareCell])),
    ),
    row(
      "Audit logs",
      {
        STARTER: "no",
        TEAM: "yes",
        ENTERPRISE: "Avancés",
      },
    ),
    row(
      "API",
      {
        STARTER: "no",
        TEAM: "no",
        ENTERPRISE: "yes",
      },
    ),
    row(
      "SSO / SAML",
      {
        STARTER: "no",
        TEAM: "no",
        ENTERPRISE: "yes",
      },
    ),
    row(
      "Marque blanche",
      {
        STARTER: "no",
        TEAM: "no",
        ENTERPRISE: "yes",
      },
    ),
    row(
      "Support dédié",
      {
        STARTER: "no",
        TEAM: "no",
        ENTERPRISE: "yes",
      },
    ),
  ];

  return { plans, rows };
}
