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
import {
  VAULT_ENTRY_TYPES,
  buildVaultEntryWriteData,
  canEncryptVaultEntries,
  maskVaultEntryValue,
  validateVaultEntryValue,
} from "@/lib/vault-entry-value";
import { auditVaultAction } from "@/lib/vault-audit";

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
  const vaultIdArg = typeof args.vaultId === "string" ? args.vaultId.trim() : undefined;

  if (!label || !typeRaw || !value) {
    return mcpErrorResult("label, type et value requis.");
  }

  if (!VAULT_ENTRY_TYPES.includes(typeRaw as (typeof VAULT_ENTRY_TYPES)[number])) {
    return mcpErrorResult(`type invalide. Valeurs : ${VAULT_ENTRY_TYPES.join(", ")}`);
  }

  const valueCheck = validateVaultEntryValue(typeRaw, value);
  if (!valueCheck.ok) return mcpErrorResult(valueCheck.error);

  if (!canEncryptVaultEntries()) {
    return mcpErrorResult("Chiffrement coffre indisponible (configuration serveur).");
  }

  const labelCheck = assertSafeDisplayText(label, "Label");
  if (!labelCheck.ok) return mcpErrorResult(labelCheck.reason);

  const { vault, error } = await resolveUserVault(ctx.userId, ctx.plan, vaultIdArg);
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

  const enc = buildVaultEntryWriteData(value);

  const entry = await prisma.trustVaultEntry.create({
    data: {
      vaultId: vault.vaultId,
      name: labelCheck.value,
      type: typeRaw as (typeof VAULT_ENTRY_TYPES)[number],
      value: enc.value,
      valueEnc: enc.valueEnc,
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

  auditVaultAction({
    action: "VAULT_ENTRY_CREATED",
    userId: ctx.userId,
    vaultId: vault.vaultId,
    entryId: entry.id,
    entryType: entry.type,
    valueForHash: value,
    metadata: { source: "mcp" },
  });

  return mcpJsonResult({
    vaultEntryId: entry.id,
    label: entry.name,
    type: entry.type,
    valuePreview: maskVaultEntryValue(entry.type, value),
    associatedContact: associatedEmail ?? null,
    storedAt: entry.createdAt.toISOString(),
    message: "Entrée stockée dans le coffre (chiffrée AES-256-GCM au repos).",
  });
}
