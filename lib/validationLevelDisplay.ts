// lib/validationLevelDisplay.ts
// Libellés UI pour ValidationLevel (évite bronze / argent / or côté client)
// ============================================================

import { isDiscoveryPlan } from "@/lib/plan-features";

export function getValidationLevelLabel(level: string): string {
  switch (level) {
    case "BRONZE":
      return "Essentiel";
    case "SILVER":
      return "Premium";
    case "GOLD":
      return "Business";
    case "PLATINUM":
      return "Platinum";
    default:
      return level;
  }
}

/** Couleurs d’accent par palier (pas de libellé métal affiché). */
export function getValidationLevelAccentClass(level: string): string {
  switch (level) {
    case "BRONZE":
      return "text-bt-cyan";
    case "SILVER":
      return "text-sky-300";
    case "GOLD":
      return "text-[#BDA76B]";
    case "PLATINUM":
      return "text-purple-400";
    default:
      return "text-white/70";
  }
}

/** Libellé niveau certificat — plan Découverte + BRONZE → « Découverte » (jamais le métal brut). */
export function getCertificateLevelDisplayLabel(
  level: string,
  effectivePlan?: string | null,
): string {
  if (isDiscoveryPlan(effectivePlan) && level === "BRONZE") {
    return "Découverte";
  }
  return getValidationLevelLabel(level);
}
