// lib/vault-entry-value.ts
// Normalisation, comparaison, masquage et validation des entrées coffre.
// ============================================================

import { createHash, timingSafeEqual } from "node:crypto";
import type { VaultEntryType } from "@prisma/client";
import {
  decryptVaultEntryValue,
  encryptVaultEntryValue,
  canEncryptVaultEntries,
} from "@/lib/vault-entry-crypto";

export { canEncryptVaultEntries };

export const VAULT_ENTRY_TYPES = [
  "CONTACT",
  "DOMAIN",
  "EMAIL",
  "PHONE",
  "URL",
  "WALLET",
  "IBAN",
] as const satisfies readonly VaultEntryType[];

export type VaultFraudAlert = {
  level: "OK" | "CRITICAL";
  type: "RIB_MATCH" | "RIB_MISMATCH";
  message: string;
  recommendation?: string;
  expectedEntryId?: string;
  expectedLabel?: string;
};

export type VaultEntryRow = {
  id: string;
  name: string;
  type: VaultEntryType | string;
  value: string;
  valueEnc?: string | null;
  description?: string | null;
};

export function normalizeVaultCompareValue(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function vaultValuesMatch(stored: string, received: string): boolean {
  const a = normalizeVaultCompareValue(stored);
  const b = normalizeVaultCompareValue(received);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return a === b;
  }
}

/** Lit la valeur en clair (déchiffrée ou legacy). */
export function readVaultEntryPlaintext(entry: {
  value: string;
  valueEnc?: string | null;
}): string {
  if (entry.valueEnc) {
    const dec = decryptVaultEntryValue(entry.valueEnc);
    if (dec !== null) return dec;
  }
  return entry.value;
}

/** Données d'écriture : valueEnc chiffré, value vidé. */
export function buildVaultEntryWriteData(plaintext: string): {
  value: string;
  valueEnc: string;
} {
  const trimmed = plaintext.trim();
  return {
    value: "",
    valueEnc: encryptVaultEntryValue(trimmed),
  };
}

export function hashVaultValueForAudit(value: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
  return createHash("sha256")
    .update(`${normalizeVaultCompareValue(value)}:${secret}`)
    .digest("hex")
    .slice(0, 16);
}

export function looksLikeIban(value: string): boolean {
  const n = normalizeVaultCompareValue(value);
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(n);
}

export function validateIbanMod97(iban: string): boolean {
  const n = normalizeVaultCompareValue(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(n)) return false;
  const rearranged = n.slice(4) + n.slice(0, 4);
  let remainder = "";
  for (const ch of rearranged) {
    const chunk = remainder + (ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch);
    remainder = String(Number(chunk) % 97);
  }
  return Number(remainder) === 1;
}

export function validateVaultEntryValue(
  type: VaultEntryType | string,
  value: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "Valeur requise." };
  if (type === "IBAN") {
    if (!validateIbanMod97(trimmed)) {
      return { ok: false, error: "IBAN invalide (contrôle mod-97)." };
    }
  }
  if (type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Adresse email invalide." };
  }
  return { ok: true };
}

export function maskVaultEntryValue(
  type: VaultEntryType | string,
  plaintext: string,
): string {
  const t = String(type).toUpperCase();
  if (t === "IBAN" || looksLikeIban(plaintext)) {
    const n = normalizeVaultCompareValue(plaintext);
    if (n.length >= 8) {
      return `${n.slice(0, 4)} •••• ${n.slice(-4)}`;
    }
  }
  if (t === "EMAIL" && plaintext.includes("@")) {
    const [local, domain] = plaintext.split("@");
    if (local && domain) {
      return `${local.slice(0, 2)}•••@${domain}`;
    }
  }
  if (plaintext.length <= 8) return "••••••••";
  return `${plaintext.slice(0, 2)}••••${plaintext.slice(-4)}`;
}

export function isRibCompareCandidate(entry: {
  type: VaultEntryType | string;
  name: string;
}): boolean {
  const t = String(entry.type).toUpperCase();
  const name = entry.name.toLowerCase();
  return (
    t === "IBAN" ||
    t === "CONTACT" ||
    name.includes("rib") ||
    name.includes("iban")
  );
}

/**
 * Compare une valeur reçue au pool d'entrées.
 * Mismatch SEULEMENT si aucune entrée ne matche.
 */
export function compareVaultRibValues(
  entries: VaultEntryRow[],
  compareValue: string,
): { fraudAlert?: VaultFraudAlert; matchedEntryId?: string } {
  const withPlain = entries.map((e) => ({
    ...e,
    valuePlain: readVaultEntryPlaintext(e),
  }));

  const ribCandidates = withPlain.filter(isRibCompareCandidate);
  const pool = ribCandidates.length > 0 ? ribCandidates : withPlain;

  if (pool.length === 0) return {};

  const matches = pool.filter((e) => vaultValuesMatch(e.valuePlain, compareValue));

  if (matches.length > 0) {
    const match = matches[0];
    return {
      matchedEntryId: match.id,
      fraudAlert: {
        level: "OK",
        type: "RIB_MATCH",
        message: "La valeur reçue correspond à une entrée de votre coffre.",
        expectedEntryId: match.id,
        expectedLabel: match.name,
      },
    };
  }

  const first = pool[0];
  return {
    fraudAlert: {
      level: "CRITICAL",
      type: "RIB_MISMATCH",
      message:
        "ALERTE FRAUDE — Le RIB/IBAN reçu ne correspond à aucune valeur stockée dans votre coffre.",
      expectedEntryId: first.id,
      expectedLabel: first.name,
      recommendation:
        "Ne pas effectuer le virement. Contactez le bénéficiaire par un canal vérifié (téléphone connu).",
    },
  };
}

export function serializeVaultEntryForClient(
  entry: VaultEntryRow & { id: string; name: string; createdAt?: Date | string },
  options: { canReveal: boolean },
): {
  id: string;
  name: string;
  type: VaultEntryType | string;
  maskedValue: string;
  description: string | null;
  createdAt?: Date | string;
  canReveal: boolean;
} {
  const plaintext = readVaultEntryPlaintext(entry);
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    maskedValue: maskVaultEntryValue(entry.type, plaintext),
    description: entry.description ?? null,
    ...(entry.createdAt !== undefined ? { createdAt: entry.createdAt } : {}),
    canReveal: options.canReveal,
  };
}
