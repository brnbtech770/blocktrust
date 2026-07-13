// lib/auth-credentials-client.ts
// Connexion credentials côté client — contourne le bug Auth.js `new URL(relative)` + soft nav
// ============================================================

import { parseCredentialsSignInError } from "@/lib/auth-signin-errors";
import { callbackUrlToPath } from "@/app/lib/auth-callback-url";

export type CredentialsClientSignInResult =
  | { ok: true; redirectPath: string }
  | { ok: false; message: string; tone: "error" | "warning" };

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
