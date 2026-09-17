// lib/csrf-origin-guard.ts
// CSRF Auth.js + contrôle Origin/Referer sur mutations cookie-auth.
// ============================================================

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CSRF_COOKIE_NAMES = [
  "__Host-authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "authjs.csrf-token",
] as const;

const MUTATING_HTTP_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Routes Auth.js custom (hors [...nextauth]) — cookie + Origin requis. */
const CUSTOM_AUTH_MUTATION_PATHS = [
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend-verification",
  "/api/auth/login-check",
] as const;

/** Routes authentifiées par clé API (extension / MCP) — pas de cookie CSRF. */
const EXTENSION_API_KEY_PATHS = [
  "/api/bis/sign",
  "/api/extension/add-contact",
  "/api/extension/me",
  "/api/extension/verify-sender",
] as const;

type HeaderReader = { headers: { get(name: string): string | null } };

function pathEqualsOrPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function appOrigin(): string | null {
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://blocktrust.tech";
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

function allowedAppOrigins(): Set<string> {
  const expected = appOrigin();
  const origins = new Set<string>();
  if (!expected) return origins;
  origins.add(expected);
  try {
    const url = new URL(expected);
    if (url.hostname.startsWith("www.")) {
      origins.add(`${url.protocol}//${url.hostname.slice(4)}`);
    } else {
      origins.add(`${url.protocol}//www.${url.hostname}`);
    }
  } catch {
    /* ignore */
  }
  return origins;
}

export function readAuthJsCsrfCookie(req: NextRequest): string | null {
  for (const name of CSRF_COOKIE_NAMES) {
    const raw = req.cookies.get(name)?.value;
    if (!raw) continue;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

/** Double-submit Auth.js : token body === cookie CSRF. */
export function validateAuthJsCsrf(
  req: NextRequest,
  submitted: string | undefined,
): boolean {
  const token = submitted?.trim();
  if (!token) return false;

  const cookie = readAuthJsCsrfCookie(req);
  if (!cookie) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(cookie);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Bloque les requêtes cross-site sur mutations (complète SameSite=lax).
 * Origin prioritaire ; Referer en secours.
 * Apex et www du domaine applicatif sont tous deux acceptés.
 */
export function isSameOriginMutation(req: HeaderReader): boolean {
  const allowed = allowedAppOrigins();
  if (allowed.size === 0) return false;

  const origin = req.headers.get("origin")?.trim();
  if (origin) {
    return allowed.has(origin);
  }

  const referer = req.headers.get("referer")?.trim();
  if (referer) {
    try {
      return allowed.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  return false;
}

export type MutationGuardResult =
  | { ok: true }
  | { ok: false; status: 403; message: string };

export function assertSameOriginMutation(req: HeaderReader): MutationGuardResult {
  if (isSameOriginMutation(req)) return { ok: true };
  return {
    ok: false,
    status: 403,
    message: "Requête refusée (origine non autorisée).",
  };
}

export function sameOriginMutationResponse(req: HeaderReader): NextResponse | null {
  const guard = assertSameOriginMutation(req);
  if (guard.ok) return null;
  return NextResponse.json({ error: guard.message }, { status: guard.status });
}

export function isMutatingHttpMethod(method: string): boolean {
  return MUTATING_HTTP_METHODS.has(method.toUpperCase());
}

/** Auth.js interne — ne pas intercepter (MissingCSRF / OAuth / cookies). */
export function isNextAuthInternalPath(pathname: string): boolean {
  if (!pathname.startsWith("/api/auth")) return false;
  return !CUSTOM_AUTH_MUTATION_PATHS.some((path) => pathEqualsOrPrefix(pathname, path));
}

export function hasApiKeyAuthHeader(headers: { get(name: string): string | null }): boolean {
  if (headers.get("x-api-key")?.trim()) return true;
  const authorization = headers.get("authorization")?.trim();
  return Boolean(authorization && /^Bearer\s+\S+/i.test(authorization));
}

export type CsrfExemptReason =
  | "not-mutating"
  | "nextauth"
  | "cron"
  | "stripe-webhook"
  | "mcp"
  | "public"
  | "extension-api-key";

/**
 * Null = Origin obligatoire.
 * Les webhooks Stripe, crons QStash/Vercel, MCP et l’extension (clé API)
 * n’envoient pas Origin navigateur — ils restent exempts.
 */
export function csrfExemptReason(
  pathname: string,
  method: string,
  headers: { get(name: string): string | null },
): CsrfExemptReason | null {
  if (!isMutatingHttpMethod(method)) return "not-mutating";

  if (isNextAuthInternalPath(pathname)) return "nextauth";
  if (pathEqualsOrPrefix(pathname, "/api/cron")) return "cron";
  if (
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/stripe/identity-webhook"
  ) {
    return "stripe-webhook";
  }
  if (pathname === "/mcp" || pathname.startsWith("/mcp/")) return "mcp";

  if (
    pathEqualsOrPrefix(pathname, "/api/public") ||
    pathname === "/api/v2/verify" ||
    pathEqualsOrPrefix(pathname, "/api/v2/verify") ||
    pathname === "/api/health" ||
    pathname === "/api/pricing" ||
    pathEqualsOrPrefix(pathname, "/api/badge") ||
    pathEqualsOrPrefix(pathname, "/api/bis/verify") ||
    pathname === "/api/verify/resolve-token" ||
    pathname === "/api/verify/link-qr"
  ) {
    return "public";
  }

  if (
    EXTENSION_API_KEY_PATHS.some((path) => pathEqualsOrPrefix(pathname, path)) &&
    hasApiKeyAuthHeader(headers)
  ) {
    return "extension-api-key";
  }

  return null;
}

export function shouldEnforceCsrfOrigin(
  pathname: string,
  method: string,
  headers: { get(name: string): string | null },
): boolean {
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/mcp")) {
    return false;
  }
  return csrfExemptReason(pathname, method, headers) === null;
}
