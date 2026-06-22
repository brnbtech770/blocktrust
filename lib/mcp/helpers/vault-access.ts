// lib/mcp/helpers/vault-access.ts
// Accès coffre MCP (organisation B2B + Premium).
// ============================================================

import { prisma } from "@/app/lib/db";
import { orgRoleCanManageVaults } from "@/lib/org-vault-server";
import { countOrgVaultEntries, getVaultQuota } from "@/lib/vault-utils";
import { mcpPlanAllowsVault } from "@/lib/mcp/helpers/plan-gates";

export type ResolvedVault = {
  vaultId: string;
  organizationId: string;
  canManage: boolean;
};

export async function resolveUserVault(
  userId: string,
  plan: string,
): Promise<{ vault: ResolvedVault | null; error?: string }> {
  if (!mcpPlanAllowsVault(plan)) {
    return {
      vault: null,
      error: "Le Vault est disponible à partir du plan Premium ou sur les plans professionnels.",
    };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, joinedAt: { not: null } },
    include: {
      organization: {
        include: { vaults: { orderBy: { createdAt: "asc" }, take: 1 } },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership?.organization.vaults[0]) {
    return {
      vault: null,
      error:
        "Aucun coffre disponible. Rejoignez une organisation B2B ou contactez le support.",
    };
  }

  const vault = membership.organization.vaults[0];
  return {
    vault: {
      vaultId: vault.id,
      organizationId: membership.organizationId,
      canManage: orgRoleCanManageVaults(membership.role),
    },
  };
}

export async function assertVaultWriteQuota(organizationId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { tier: true },
  });
  if (!org) return "Organisation introuvable.";
  const quotas = getVaultQuota(org.tier);
  const total = await countOrgVaultEntries(organizationId);
  if (total >= quotas.maxEntries) return "Quota d'entrées coffre atteint.";
  return null;
}
