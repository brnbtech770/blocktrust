// lib/turnstile.ts
// Vérification Cloudflare Turnstile (inscription) — fail-safe si indisponible
// ============================================================

import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";
import {
  isTurnstileIpBlocked,
  recordTurnstileBypass,
} from "@/lib/turnstile-ip-block";

export type TurnstileRegisterInput = {
  token?: string | null;
  bypass?: boolean;
  ip?: string | null;
};

export type TurnstileRegisterResult =
  | { ok: true; skipped: true; reason: "no_secret" | "client_bypass" }
  | { ok: true; skipped: false }
  | { ok: false; reason: "missing_token" | "invalid_token" | "ip_blocked" };

export function isTurnstileSecretConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

async function siteverifyToken(token: string, secret: string): Promise<boolean> {
  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
    });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch (err) {
    console.error("[turnstile] verify error", err);
    return false;
  }
}

async function auditTurnstileBypass(
  ip: string | null | undefined,
  reason: string,
): Promise<boolean> {
  writeSecurityAuditLogFireAndForget({
    action: "TURNSTILE_BYPASS",
    resource: "auth",
    resourceId: "register",
    ip,
    metadata: { reason },
  });
  return recordTurnstileBypass(ip);
}

/** Inscription : ne bloque jamais si secret absent ou bypass client signalé. */
export async function verifyTurnstileForRegister(
  input: TurnstileRegisterInput,
): Promise<TurnstileRegisterResult> {
  const ip = input.ip ?? null;

  if (await isTurnstileIpBlocked(ip ?? "unknown")) {
    return { ok: false, reason: "ip_blocked" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY absent — vérification ignorée");
    const allowed = await auditTurnstileBypass(ip, "no_secret");
    if (!allowed) return { ok: false, reason: "ip_blocked" };
    return { ok: true, skipped: true, reason: "no_secret" };
  }

  // Bypass client : widget indisponible / token périmé — comptabilisé par IP.
  if (input.bypass) {
    const allowed = await auditTurnstileBypass(ip, "client_widget_unavailable");
    if (!allowed) return { ok: false, reason: "ip_blocked" };
    return { ok: true, skipped: true, reason: "client_bypass" };
  }

  const token = input.token?.trim();
  if (token) {
    const valid = await siteverifyToken(token, secret);
    if (!valid) return { ok: false, reason: "invalid_token" };
    return { ok: true, skipped: false };
  }

  return { ok: false, reason: "missing_token" };
}

/** @deprecated Préférer verifyTurnstileForRegister pour l'inscription. */
export async function verifyTurnstileToken(token: string | null | undefined): Promise<boolean> {
  const result = await verifyTurnstileForRegister({ token, bypass: false });
  return result.ok;
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}
