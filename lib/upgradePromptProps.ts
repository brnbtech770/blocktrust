/**
 * Libellés et paliers d’upgrade pour UpgradePrompt — montants et noms depuis lib/pricing.ts.
 */

import {
  formatPlanMonthlyPriceLabel,
  getMaxContacts,
  normalizePlanQuotaKey,
} from "@/lib/pricing";
import { getPlanDisplayLabel } from "@/lib/plan-features";

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

/** Construit les props UpgradePrompt à partir du plan d’abonnement et du plafond actuel (max). */
export function buildUpgradePromptProps(
  planKey: string,
  maxCertificates: number
): UpgradePromptPropsInput {
  const p = planKey.toUpperCase();
  const planName = getPlanDisplayLabel(planKey);
  const currentLimit = maxCertificates;
  const core = normalizePlanQuotaKey(p);

  if (core === "FAMILLE" || core === "FAMILLE_PLUS" || isB2BPlan(p)) {
    return {
      planName,
      currentLimit,
      nextPlanName: "plan supérieur",
      nextPlanLimit: getMaxContacts("FAMILLE"),
      nextPlanPrice: "Voir les offres",
      upgradeHref: "/pricing",
    };
  }

  if (core === "PREMIUM") {
    const nextPlan = "FAMILLE";
    return {
      planName,
      currentLimit,
      nextPlanName: getPlanDisplayLabel(nextPlan),
      nextPlanLimit: getMaxContacts(nextPlan),
      nextPlanPrice: formatPlanMonthlyPriceLabel(nextPlan) ?? "Voir les offres",
      upgradeHref: "/pricing",
    };
  }

  // Essentiel, Découverte, essai, ou inconnu → montée vers Premium (Trust Circle)
  const nextPlan = "PREMIUM";
  return {
    planName,
    currentLimit,
    nextPlanName: getPlanDisplayLabel(nextPlan),
    nextPlanLimit: getMaxContacts(nextPlan),
    nextPlanPrice: formatPlanMonthlyPriceLabel(nextPlan) ?? "Voir les offres",
    upgradeHref: "/pricing",
  };
}
