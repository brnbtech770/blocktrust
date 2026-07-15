// lib/csrf-origin-guard.ts
// CSRF Auth.js + contrôle Origin/Referer sur mutations cookie-auth.
// ============================================================

import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const CSRF_COOKIE_NAMES = [
  "__Host-authjs.csrf-token",
  "__Secure-authjs.csrf-token",
  "authjs.csrf-token",
] as const;

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
 */
export function isSameOriginMutation(req: NextRequest): boolean {
  const expected = appOrigin();
  if (!expected) return false;

  const origin = req.headers.get("origin")?.trim();
  if (origin) {
    return origin === expected;
  }

  const referer = req.headers.get("referer")?.trim();
  if (referer) {
    try {
      return new URL(referer).origin === expected;
    } catch {
      return false;
    }
  }

  return false;
}

export type MutationGuardResult =
  | { ok: true }
  | { ok: false; status: 403; message: string };

export function assertSameOriginMutation(req: NextRequest): MutationGuardResult {
  if (isSameOriginMutation(req)) return { ok: true };
  return {
    ok: false,
    status: 403,
    message: "Requête refusée (origine non autorisée).",
  };
}
