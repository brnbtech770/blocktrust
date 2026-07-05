// lib/vault-audit.ts
// AuditLog coffre — jamais de PII en clair.
// ============================================================

import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";
import { hashVaultValueForAudit } from "@/lib/vault-entry-value";

export type VaultAuditAction =
  | "VAULT_ENTRY_CREATED"
  | "VAULT_ENTRY_UPDATED"
  | "VAULT_ENTRY_DELETED"
  | "VAULT_ENTRY_REVEALED"
  | "VAULT_COMPARE";

export function auditVaultAction(params: {
  action: VaultAuditAction;
  userId: string;
  vaultId: string;
  entryId?: string;
  entryType?: string;
  valueForHash?: string;
  metadata?: Record<string, unknown>;
}): void {
  writeSecurityAuditLogFireAndForget({
    action: params.action,
    userId: params.userId,
    resource: "vault",
    resourceId: params.entryId ?? params.vaultId,
    metadata: {
      vaultId: params.vaultId,
      entryId: params.entryId,
      entryType: params.entryType,
      ...(params.valueForHash
        ? { valueHash: hashVaultValueForAudit(params.valueForHash) }
        : {}),
      ...params.metadata,
    },
  });
}
