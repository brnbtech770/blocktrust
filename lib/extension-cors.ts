// lib/extension-cors.ts
// CORS pour l’extension Chrome (chrome-extension://*, Gmail content script, Outlook Web, app BLOCKTRUST).
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
  "outlook.office.com",
  "outlook.office365.com",
  "outlook.live.com",
]);

// Hôtes locaux (dev uniquement) — comparaison EXACTE.
const ALLOWED_LOCAL_HOSTNAMES = new Set<string>(["localhost", "127.0.0.1"]);

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * IDs d'extension autorisés : EXTENSION_ID="abc,def" (ou NEXT_PUBLIC_EXTENSION_ID).
 * Prod sans EXTENSION_ID → toute origine chrome-extension:// est refusée.
 * Dev sans EXTENSION_ID → permissif (toute extension locale).
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

function isChromeExtensionOriginAllowed(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const ids = allowedExtensionIds();

  if (isProductionEnv()) {
    if (!ids) return false;
    return ids.has(normalized);
  }

  return ids ? ids.has(normalized) : true;
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

  if (url.protocol === "chrome-extension:") {
    return isChromeExtensionOriginAllowed(hostname);
  }

  if (
    process.env.NODE_ENV !== "production" &&
    ALLOWED_LOCAL_HOSTNAMES.has(hostname) &&
    (url.protocol === "http:" || url.protocol === "https:")
  ) {
    return true;
  }

  if (url.protocol === "https:") {
    return ALLOWED_HTTPS_HOSTNAMES.has(hostname);
  }

  return false;
}

/**
 * Rejette les requêtes chrome-extension:// non autorisées (403).
 * Retourne null si la requête peut continuer.
 */
export function rejectForbiddenExtensionOrigin(
  req: NextRequest,
): NextResponse | null {
  const origin = req.headers.get("origin")?.trim() ?? "";
  if (!origin) return null;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }

  if (url.protocol !== "chrome-extension:") return null;
  if (isChromeExtensionOriginAllowed(url.hostname)) return null;

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const allowed = isAllowedOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : FALLBACK_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
  };
}

export const extensionCorsHeaders = getCorsHeaders;

export function extensionJsonResponse(
  req: NextRequest,
  body: unknown,
  status = 200,
): NextResponse {
  const forbidden = rejectForbiddenExtensionOrigin(req);
  if (forbidden) return forbidden;

  return NextResponse.json(body, { status, headers: getCorsHeaders(req) });
}

export function extensionOptionsResponse(req: NextRequest): Response {
  const forbidden = rejectForbiddenExtensionOrigin(req);
  if (forbidden) return forbidden;

  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
