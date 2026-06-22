// lib/mcp/tools/search-vault.ts
// Tool search_vault — recherche + détection fraude RIB (compareValue).
// ============================================================

import { prisma } from "@/app/lib/db";
import { timingSafeEqual, createHash } from "node:crypto";
import { resolveUserVault } from "@/lib/mcp/helpers/vault-access";
import { mcpErrorResult, mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

function normalizeCompareValue(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function valuesMatch(stored: string, received: string): boolean {
  const a = normalizeCompareValue(stored);
  const b = normalizeCompareValue(received);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return a === b;
  }
}

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

  const { vault, error } = await resolveUserVault(ctx.userId, ctx.plan);
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
      description: true,
      createdAt: true,
    },
  });

  let filtered = entries;
  if (query) {
    filtered = filtered.filter(
      (e) =>
        e.name.toLowerCase().includes(query) ||
        e.value.toLowerCase().includes(query) ||
        (e.description?.toLowerCase().includes(query) ?? false),
    );
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
  if (compareValue) {
    const ribCandidates = filtered.filter(
      (e) => e.type === "CONTACT" || e.name.toLowerCase().includes("rib") || e.name.toLowerCase().includes("iban"),
    );
    const pool = ribCandidates.length > 0 ? ribCandidates : filtered;

    for (const entry of pool) {
      if (!valuesMatch(entry.value, compareValue)) {
        fraudAlert = {
          level: "CRITICAL",
          type: "RIB_MISMATCH",
          message:
            "ALERTE FRAUDE — Le RIB/IBAN reçu ne correspond pas à la valeur stockée dans votre coffre.",
          expectedEntryId: entry.id,
          expectedLabel: entry.name,
          recommendation:
            "Ne pas effectuer le virement. Contactez le bénéficiaire par un canal vérifié (téléphone connu).",
        };
        break;
      }
    }

    if (!fraudAlert && pool.length > 0) {
      fraudAlert = {
        level: "OK",
        type: "RIB_MATCH",
        message: "La valeur reçue correspond à une entrée de votre coffre.",
      };
    }
  }

  const compareHash = compareValue
    ? createHash("sha256").update(normalizeCompareValue(compareValue)).digest("hex").slice(0, 12)
    : null;

  return mcpJsonResult({
    total: filtered.length,
    entries: filtered.map((e) => ({
      id: e.id,
      label: e.name,
      type: e.type,
      // Ne pas exposer la valeur complète sauf si compareValue fourni et match
      valuePreview: compareValue ? undefined : `${e.value.slice(0, 4)}…${e.value.slice(-4)}`,
      storedValue: compareValue ? e.value : undefined,
      description: e.description,
      storedAt: e.createdAt.toISOString(),
    })),
    compareHash,
    fraudAlert,
  });
}
