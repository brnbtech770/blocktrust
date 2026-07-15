// lib/auth-credentials-client.ts
// Connexion credentials côté client — contourne le bug Auth.js `new URL(relative)` + soft nav
// ============================================================

import { parseCredentialsSignInError } from "@/lib/auth-signin-errors";
import { callbackUrlToPath } from "@/app/lib/auth-callback-url";

export type CredentialsClientSignInResult =
  | { ok: true; redirectPath: string }
  | {
      ok: false;
      message: string;
      tone: "error" | "warning";
      errorKind?: "locked" | "invalid" | "no_password" | "account_suspended" | "rate_limited";
      attemptsRemaining?: number;
      minutesRemaining?: number;
    };

type AuthRedirectParse = {
  error?: string;
  code?: string;
};

/** Parse une URL de redirect Auth.js (relative ou absolue) sans throw. */
export function parseAuthRedirectUrl(
  url: string | null | undefined,
  baseOrigin?: string,
): AuthRedirectParse {
  if (!url) return {};
  const base =
    baseOrigin ??
    (typeof window !== "undefined" ? window.location.origin : "https://blocktrust.tech");
  try {
    const parsed = new URL(url, base);
    return {
      error: parsed.searchParams.get("error") ?? undefined,
      code: parsed.searchParams.get("code") ?? undefined,
    };
  } catch {
    if (url.includes("account_locked") || url.includes("AccountLocked")) {
      return { error: "AccountLocked", code: "account_locked" };
    }
    if (url.includes("account_suspended") || url.includes("AccountSuspended")) {
      return { error: "AccountSuspended", code: "account_suspended" };
    }
    if (url.includes("no_password") || url.includes("NoPassword")) {
      return { error: "NoPassword", code: "no_password" };
    }
    if (url.includes("CredentialsSignin")) {
      return { error: "CredentialsSignin", code: "credentials" };
    }
    const lockMatch = url.match(/(LOCKED:\d+|FAILED:\d+)/);
    if (lockMatch?.[1]) {
      return { error: lockMatch[1], code: lockMatch[1] };
    }
    return {};
  }
}

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/csrf", { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { csrfToken?: string };
    return data.csrfToken ?? null;
  } catch {
    return null;
  }
}

type LoginCheckResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  tone?: "error" | "warning";
  attemptsRemaining?: number;
  minutesRemaining?: number;
};

function mapLoginCheckFailure(data: LoginCheckResponse): CredentialsClientSignInResult {
  const tone = data.tone === "warning" ? "warning" : "error";
  const errorKind =
    data.error === "locked" ||
    data.error === "invalid" ||
    data.error === "no_password" ||
    data.error === "account_suspended" ||
    data.error === "rate_limited"
      ? data.error
      : undefined;

  return {
    ok: false,
    message: data.message ?? "Email ou mot de passe incorrect.",
    tone,
    errorKind,
    attemptsRemaining: data.attemptsRemaining,
    minutesRemaining: data.minutesRemaining,
  };
}

/** Pré-vérification lockout + credentials (messages explicites avant callback NextAuth). */
export async function preCheckCredentialsLogin(input: {
  email: string;
  password: string;
}): Promise<CredentialsClientSignInResult | null> {
  try {
    const res = await fetch("/api/auth/login-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      }),
    });

    let data: LoginCheckResponse;
    try {
      data = (await res.json()) as LoginCheckResponse;
    } catch {
      return null;
    }

    if (data.ok) {
      return null;
    }

    if (res.status === 429 || data.error === "rate_limited") {
      return {
        ok: false,
        message: data.message ?? "Trop de tentatives. Réessayez plus tard.",
        tone: "error",
        errorKind: "rate_limited",
      };
    }

    return mapLoginCheckFailure(data);
  } catch {
    return null;
  }
}

/**
 * POST direct vers /api/auth/callback/credentials (évite signIn() next-auth/react).
 */
export async function signInWithCredentialsClient(input: {
  email: string;
  password: string;
  callbackUrl?: string;
}): Promise<CredentialsClientSignInResult> {
  const emailNorm = input.email.trim().toLowerCase();
  const password = input.password;
  const redirectPath = callbackUrlToPath(input.callbackUrl ?? "/dashboard");

  if (!emailNorm || !password) {
    return { ok: false, message: "Email ou mot de passe incorrect.", tone: "error" };
  }

  const preCheck = await preCheckCredentialsLogin({ email: emailNorm, password });
  if (preCheck) {
    return preCheck;
  }

  const csrfToken = await fetchCsrfToken();
  if (!csrfToken) {
    return { ok: false, message: "Erreur de connexion, réessayez", tone: "error" };
  }

  let res: Response;
  try {
    res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      credentials: "include",
      body: new URLSearchParams({
        csrfToken,
        email: emailNorm,
        password,
        callbackUrl: redirectPath,
      }),
    });
  } catch {
    return { ok: false, message: "Erreur de connexion, réessayez", tone: "error" };
  }

  let data: { url?: string };
  try {
    data = (await res.json()) as { url?: string };
  } catch {
    return { ok: false, message: "Erreur de connexion, réessayez", tone: "error" };
  }

  if (res.ok) {
    return { ok: true, redirectPath };
  }

  const parsed = parseAuthRedirectUrl(data.url);
  const signInError = parseCredentialsSignInError({
    ok: false,
    error: parsed.error ?? parsed.code ?? "CredentialsSignin",
    code: parsed.code ?? parsed.error,
    url: data.url ?? null,
  });

  return { ok: false, message: signInError.message, tone: signInError.tone };
}

/** Navigation pleine page — le cookie session est visible par le serveur / middleware. */
export function redirectAfterCredentialsSignIn(redirectPath: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(redirectPath);
}
