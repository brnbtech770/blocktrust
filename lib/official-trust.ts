// lib/official-trust.ts
// Root of Trust — comptes officiels BLOCKTRUST (source : lib/admin-utils.ts uniquement)
// ============================================================

import { getInternalEmailList } from "@/lib/admin-utils";
import type { TrustEngineResult } from "@/lib/trust-engine";

/** Entité officielle du site (badge ambassadeur). */
export const OFFICIAL_SITE_ENTITY_EMAIL = "contact@blocktrust.tech" as const;

export const OFFICIAL_TRUST_SCORE = 100 as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Email appartenant à la Root of Trust (admins dashboard, comptes internes, entité site).
 * Liste figée dans le code — jamais de champ DB modifiable par un utilisateur.
 */
export function isOfficialRootOfTrustEmail(
  email: string | null | undefined,
): boolean {
  if (!email?.trim()) return false;
  const e = normalizeEmail(email);
  if (e === OFFICIAL_SITE_ENTITY_EMAIL) return true;
  return getInternalEmailList().includes(e);
}

/**
 * Entité officielle — critère : Entity.email uniquement (pas le propriétaire).
 */
export function isOfficialEntity(
  entityEmail: string | null | undefined,
): boolean {
  return isOfficialRootOfTrustEmail(entityEmail);
}

/** @deprecated Préférer isOfficialEntity — conservé pour imports existants. */
export function isOfficialRootOfTrustEntity(
  entityEmail: string | null | undefined,
): boolean {
  return isOfficialEntity(entityEmail);
}

export function buildOfficialTrustEngineResult(): TrustEngineResult {
  return {
    globalScore: OFFICIAL_TRUST_SCORE,
    identityScore: OFFICIAL_TRUST_SCORE,
    networkScore: OFFICIAL_TRUST_SCORE,
    behaviorScore: OFFICIAL_TRUST_SCORE,
    technicalScore: OFFICIAL_TRUST_SCORE,
    signals: [
      {
        type: "OFFICIAL_ACCOUNT",
        label: "Compte officiel BLOCKTRUST™",
        impact: "positive",
        weight: OFFICIAL_TRUST_SCORE,
      },
    ],
    recommendation: "TRUST",
    contextLabel: "Compte officiel BLOCKTRUST™",
    isOfficialAccount: true,
  };
}

export function buildRevokedOfficialTrustEngineResult(): TrustEngineResult {
  return {
    globalScore: 0,
    identityScore: 0,
    networkScore: 0,
    behaviorScore: 0,
    technicalScore: 0,
    signals: [
      {
        type: "CERT_REVOKED",
        label: "Certificat révoqué",
        impact: "negative",
        weight: -100,
      },
    ],
    recommendation: "DANGER",
    contextLabel: "Certificat révoqué",
    isOfficialAccount: false,
  };
}

/** Liste normalisée pour scripts (idempotent). */
export function getOfficialRootOfTrustEmails(): string[] {
  return [...new Set([...getInternalEmailList(), OFFICIAL_SITE_ENTITY_EMAIL])];
}

/** Emails d'entités marquées à tort lors du premier déploiement Root of Trust. */
export const KNOWN_FALSE_OFFICIAL_ENTITY_EMAILS = [
  "1rst.invest@gmail.com",
] as const;

export function isKnownFalseOfficialEntityEmail(
  entityEmail: string | null | undefined,
): boolean {
  if (!entityEmail?.trim()) return false;
  const e = normalizeEmail(entityEmail);
  return KNOWN_FALSE_OFFICIAL_ENTITY_EMAILS.some((known) => known === e);
}
