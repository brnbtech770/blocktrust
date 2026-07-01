import type { TrustEngineResult } from "@/lib/trust-engine";

export const VERIFY_COLORS = {
  valid: "#10b981",
  expired: "#f59e0b",
  revoked: "#E05252",
  tampered: "#ef4444",
  invalid: "#E05252",
} as const;

export const VERIFY_FETCH_TIMEOUT_MS = 8000;

export const VERIFY_TIMEOUT_MESSAGE =
  "La vérification a pris trop de temps. Réessayez.";

export type Verdict =
  | "VALID"
  | "VALID_WITH_WARNING"
  | "TAMPERED"
  | "REVOKED"
  | "EXPIRED"
  | "INVALID"
  | "FRAUD"
  | "ERROR";

export type VerifyApiSuccess = {
  verdict: Verdict;
  reason?: string | null;
  entityName?: string;
  certifiedAt?: string | null;
  entityId?: string;
  certificateId?: string;
  jti?: string;
  error?: string;
  walletAddress?: string;
  walletNetwork?: string;
  walletNetworkDisplay?: string;
  certifiedDomains?: string[];
  certifiedEmails?: string[];
  certifiedPhones?: string[];
  trustEngine?: TrustEngineResult | null;
  identityVerified?: boolean;
};

export function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

export function tryParseUserPastedUrl(input: string): URL | null {
  const t = input.trim();
  if (!t) return null;
  try {
    return new URL(t);
  } catch {
    try {
      return new URL(t, "https://blocktrust.tech");
    } catch {
      return null;
    }
  }
}

export function extractVtFromUrl(input: string): string | null {
  const url = tryParseUserPastedUrl(input);
  if (!url) return null;
  const vt = url.searchParams.get("vt")?.trim();
  return vt && vt.length > 0 ? vt : null;
}

export function extractCertId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const url = tryParseUserPastedUrl(trimmed);
  if (url) {
    const certId = url.searchParams.get("certId")?.trim();
    if (certId && certId.length > 0) return certId;

    const segments = url.pathname.split("/").filter(Boolean);
    const verifyIdx = segments.indexOf("verify");
    if (verifyIdx >= 0 && segments[verifyIdx + 1]) {
      const idSegment = segments[verifyIdx + 1];
      if (idSegment !== "qr" && idSegment.length > 5) return idSegment;
    }
  }

  const pathMatch = trimmed.match(/\/verify\/([^/?#\s]+)/);
  if (
    pathMatch?.[1] &&
    pathMatch[1] !== "qr" &&
    pathMatch[1].length > 5
  ) {
    return pathMatch[1];
  }

  return trimmed;
}

export function formatCertifiedDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
