// lib/mcp/tools/store-in-vault.ts
// Tool store_in_vault — entrée coffre organisation.
// ============================================================

import { prisma } from "@/app/lib/db";
import { assertSafeDisplayText } from "@/lib/sanitize-display-text";
import {
  assertVaultWriteQuota,
  resolveUserVault,
} from "@/lib/mcp/helpers/vault-access";
import { mcpErrorResult, mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

const ENTRY_TYPES = ["CONTACT", "DOMAIN", "EMAIL", "PHONE", "URL", "WALLET"] as const;
type EntryType = (typeof ENTRY_TYPES)[number];

export async function handleStoreInVault(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const label = typeof args.label === "string" ? args.label.trim() : "";
  const typeRaw = typeof args.type === "string" ? args.type.trim().toUpperCase() : "";
  const value = typeof args.value === "string" ? args.value.trim() : "";
  const associatedEmail =
    typeof args.associatedEmail === "string" ? args.associatedEmail.trim().toLowerCase() : undefined;
  const notes = typeof args.notes === "string" ? args.notes.trim() : undefined;
  const expiresAt =
    typeof args.expiresAt === "string" ? args.expiresAt.trim() : undefined;

  if (!label || !typeRaw || !value) {
    return mcpErrorResult("label, type et value requis.");
  }

  if (!ENTRY_TYPES.includes(typeRaw as EntryType)) {
    return mcpErrorResult(`type invalide. Valeurs : ${ENTRY_TYPES.join(", ")}`);
  }

  const labelCheck = assertSafeDisplayText(label, "Label");
  if (!labelCheck.ok) return mcpErrorResult(labelCheck.reason);

  const { vault, error } = await resolveUserVault(ctx.userId, ctx.plan);
  if (!vault) {
    return mcpErrorResult(error ?? "Vault indisponible.", {
      upgradeUrl: "https://blocktrust.tech/pricing",
    });
  }

  if (!vault.canManage) {
    return mcpErrorResult("Droits insuffisants pour ajouter une entrée au coffre.");
  }

  const quotaError = await assertVaultWriteQuota(vault.organizationId);
  if (quotaError) return mcpErrorResult(quotaError);

  const entry = await prisma.trustVaultEntry.create({
    data: {
      vaultId: vault.vaultId,
      name: labelCheck.value,
      type: typeRaw as EntryType,
      value,
      description: notes
        ? [notes, associatedEmail ? `Contact: ${associatedEmail}` : null, expiresAt ? `Expire: ${expiresAt}` : null]
            .filter(Boolean)
            .join(" — ")
        : associatedEmail
          ? `Contact: ${associatedEmail}`
          : null,
      addedById: ctx.userId,
    },
    select: { id: true, createdAt: true, name: true, type: true },
  });

  return mcpJsonResult({
    vaultEntryId: entry.id,
    label: entry.name,
    type: entry.type,
    associatedContact: associatedEmail ?? null,
    storedAt: entry.createdAt.toISOString(),
    message: "Entrée stockée dans le coffre (donnée protégée au repos).",
  });
}
