/**
 * Libellés et paliers d’upgrade pour UpgradePrompt (copy UX, pas nécessairement = limites DB).
 */

export type UpgradePromptPropsInput = {
  planName: string;
  currentLimit: number;
  nextPlanName: string;
  nextPlanLimit: number;
  nextPlanPrice: string;
  upgradeHref: string;
};

function isB2BPlan(plan: string): boolean {
  const p = plan.toUpperCase();
  return (
    p.startsWith("B2B_") ||
    ["STARTER", "TEAM", "BUSINESS", "ENTERPRISE"].includes(p)
  );
}

export function planDisplayName(planKey: string): string {
  const p = planKey
    .toUpperCase()
    .replace(/^B2C_/, "")
    .replace(/^B2B_/, "");
  const map: Record<string, string> = {
    ESSENTIEL: "Essentiel",
    PREMIUM: "Premium",
    FAMILLE: "Famille",
    FAMILLE_PLUS: "Famille+",
    STARTER: "Starter",
    TEAM: "Team",
    BUSINESS: "Business",
    ENTERPRISE: "Enterprise",
    TRIAL: "Essai",
  };
  return map[p] ?? planKey;
}

/** Construit les props UpgradePrompt à partir du plan d’abonnement et du plafond actuel (max). */
export function buildUpgradePromptProps(
  planKey: string,
  maxCertificates: number
): UpgradePromptPropsInput {
  const p = planKey.toUpperCase();
  const planName = planDisplayName(planKey);
  const currentLimit = maxCertificates;
  const core = p.replace(/^B2C_/, "").replace(/^B2B_/, "");

  if (core === "FAMILLE_PLUS" || isB2BPlan(p)) {
    return {
      planName,
      currentLimit,
      nextPlanName: "plan supérieur",
      nextPlanLimit: 300,
      nextPlanPrice: "Voir les offres",
      upgradeHref: "/pricing",
    };
  }

  if (core === "FAMILLE") {
    return {
      planName,
      currentLimit,
      nextPlanName: "Famille+",
      nextPlanLimit: 300,
      nextPlanPrice: "24,99€/mois",
      upgradeHref: "/pricing",
    };
  }

  if (core === "PREMIUM") {
    return {
      planName,
      currentLimit,
      nextPlanName: "Famille",
      nextPlanLimit: 100,
      nextPlanPrice: "14,99€/mois",
      upgradeHref: "/pricing",
    };
  }

  // Essentiel, essai, ou inconnu → montée vers Premium
  return {
    planName,
    currentLimit,
    nextPlanName: "Premium",
    nextPlanLimit: 100,
    nextPlanPrice: "9,99€/mois",
    upgradeHref: "/pricing",
  };
}
