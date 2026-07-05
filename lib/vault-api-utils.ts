// lib/vault-api-utils.ts
// Helpers communs routes API coffre.
// ============================================================

import { NextResponse } from "next/server";
import { checkVaultRateLimit } from "@/lib/vault-rate-limit";
import type { OrgRole } from "@prisma/client";
import { orgRoleCanManageOrgSettings } from "@/lib/org-vault-server";

export async function vaultRateLimitResponse(
  userId: string,
): Promise<NextResponse | null> {
  const rl = await checkVaultRateLimit(userId);
  if (rl.allowed) return null;
  return NextResponse.json(
    { error: "Trop de requêtes coffre. Réessayez dans quelques instants." },
    {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    },
  );
}

export function orgRoleCanRevealVaultValues(role: OrgRole): boolean {
  return orgRoleCanManageOrgSettings(role);
}
