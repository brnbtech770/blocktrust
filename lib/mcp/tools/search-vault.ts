// lib/mcp/tools/search-vault.ts
// Tool search_vault — recherche + détection fraude RIB (compareValue).
// ============================================================

import { prisma } from "@/app/lib/db";
import { createHash } from "node:crypto";
import { resolveUserVault } from "@/lib/mcp/helpers/vault-access";
import { mcpErrorResult, mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";
import {
  compareVaultRibValues,
  maskVaultEntryValue,
  normalizeVaultCompareValue,
  readVaultEntryPlaintext,
} from "@/lib/vault-entry-value";
import { auditVaultAction } from "@/lib/vault-audit";

export async function handleSearchVault(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
  const typeFilter = typeof args.type === "string" ? args.type.trim().toUpperCase() : undefined;
  const associatedEmail =
    typeof args.associatedEmail === "string" ? args.associatedEmail.trim().toLowerCase() : undefined;
  const compareValue =
    typeof args.compareValue === "string" ? args.compareValue.trim() : undefined;
  const vaultIdArg = typeof args.vaultId === "string" ? args.vaultId.trim() : undefined;

  const { vault, error } = await resolveUserVault(ctx.userId, ctx.plan, vaultIdArg);
  if (!vault) {
    return mcpErrorResult(error ?? "Vault indisponible.", {
      upgradeUrl: "https://blocktrust.tech/pricing",
    });
  }

  const entries = await prisma.trustVaultEntry.findMany({
    where: { vaultId: vault.vaultId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      valueEnc: true,
      description: true,
      createdAt: true,
    },
  });

  let filtered = entries;
  if (query) {
    filtered = filtered.filter((e) => {
      const plain = readVaultEntryPlaintext(e);
      return (
        e.name.toLowerCase().includes(query) ||
        plain.toLowerCase().includes(query) ||
        (e.description?.toLowerCase().includes(query) ?? false)
      );
    });
  }
  if (typeFilter) {
    filtered = filtered.filter((e) => e.type === typeFilter);
  }
  if (associatedEmail) {
    filtered = filtered.filter(
      (e) => e.description?.toLowerCase().includes(associatedEmail) ?? false,
    );
  }

  let fraudAlert: Record<string, unknown> | undefined;
  let matchedEntryId: string | undefined;

  if (compareValue) {
    const compareResult = compareVaultRibValues(filtered, compareValue);
    if (compareResult.fraudAlert) {
      fraudAlert = compareResult.fraudAlert;
      matchedEntryId = compareResult.matchedEntryId;
    }

    auditVaultAction({
      action: "VAULT_COMPARE",
      userId: ctx.userId,
      vaultId: vault.vaultId,
      entryId: matchedEntryId,
      valueForHash: compareValue,
      metadata: {
        result: fraudAlert?.type ?? "NO_POOL",
        source: "mcp",
      },
    });
  }

  const compareHash = compareValue
    ? createHash("sha256").update(normalizeVaultCompareValue(compareValue)).digest("hex").slice(0, 12)
    : null;

  return mcpJsonResult({
    total: filtered.length,
    entries: filtered.map((e) => {
      const plain = readVaultEntryPlaintext(e);
      return {
        id: e.id,
        label: e.name,
        type: e.type,
        valuePreview: compareValue ? undefined : maskVaultEntryValue(e.type, plain),
        storedValue: compareValue ? plain : undefined,
        description: e.description,
        storedAt: e.createdAt.toISOString(),
      };
    }),
    compareHash,
    fraudAlert,
  });
}
