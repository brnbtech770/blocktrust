// lib/mcp/helpers/plan-gates.ts
// Gates plan MCP (Trust Circle, Vault, BIS sign).
// ============================================================

import { hasOrgAccess } from "@/lib/vault-utils";
import { planAllowsTrustCircle } from "@/lib/plan-features";

function normalizePlan(plan: string): string {
  return plan.trim().toUpperCase().replace(/-/g, "_").replace(/^B2[CB]_/, "");
}

export function mcpPlanAllowsTrustCircle(plan: string): boolean {
  return planAllowsTrustCircle(plan);
}

/** Vault : Premium+ (Trust Circle plans) ou B2B avec organisation. */
export function mcpPlanAllowsVault(plan: string): boolean {
  const key = normalizePlan(plan);
  return planAllowsTrustCircle(plan) || hasOrgAccess(key) || hasOrgAccess(plan);
}

export function mcpPlanAllowsBisSign(plan: string): boolean {
  const key = normalizePlan(plan);
  return key !== "DISCOVERY" && key !== "DISCOVERY_EXPIRED";
}
