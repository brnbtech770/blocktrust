// lib/extension-cors.ts
// CORS pour l’extension Chrome (chrome-extension://*, Gmail content script, app BLOCKTRUST).
// ============================================================
//
// SÉCURITÉ : l'origine est parsée avec `new URL()` puis comparée par HOSTNAME EXACT.
// On n'utilise JAMAIS includes()/endsWith() sur l'origine brute : sinon
// "https://evil-blocktrust.tech" ou "https://blocktrust.tech.attacker.com"
// passeraient (la sous-chaîne matche).

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const FALLBACK_ORIGIN = "https://blocktrust.tech";

// Hôtes HTTPS autorisés — comparaison de hostname EXACT.
const ALLOWED_HTTPS_HOSTNAMES = new Set<string>([
  "blocktrust.tech",
  "www.blocktrust.tech",
  "mail.google.com",
]);

// Hôtes locaux (dev uniquement) — comparaison EXACTE.
const ALLOWED_LOCAL_HOSTNAMES = new Set<string>(["localhost", "127.0.0.1"]);

/**
 * IDs d'extension autorisés (optionnel) : EXTENSION_ID="abc,def".
 * Si défini, seules ces extensions sont acceptées. Sinon, toute origine
 * `chrome-extension://` est acceptée (le schéma est un préfixe sûr et le
 * bypass par sous-chaîne ne s'applique pas ici).
 */
function allowedExtensionIds(): Set<string> | null {
  const raw = (process.env.EXTENSION_ID ?? process.env.NEXT_PUBLIC_EXTENSION_ID ?? "").trim();
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
}

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  // Extension Chrome — hostname = ID de l'extension.
  if (url.protocol === "chrome-extension:") {
    const ids = allowedExtensionIds();
    return ids ? ids.has(hostname) : true;
  }

  // Dev local — http(s)://localhost ou 127.0.0.1 (hostname exact).
  if (
    process.env.NODE_ENV !== "production" &&
    ALLOWED_LOCAL_HOSTNAMES.has(hostname) &&
    (url.protocol === "http:" || url.protocol === "https:")
  ) {
    return true;
  }

  // Hôtes HTTPS de production — hostname exact.
  if (url.protocol === "https:") {
    return ALLOWED_HTTPS_HOSTNAMES.has(hostname);
  }

  return false;
}

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = isAllowedOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : FALLBACK_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export const extensionCorsHeaders = getCorsHeaders;

export function extensionJsonResponse(
  req: NextRequest,
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status, headers: getCorsHeaders(req) });
}
