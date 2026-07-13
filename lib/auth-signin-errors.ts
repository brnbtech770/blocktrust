// lib/auth-signin-errors.ts
// Messages utilisateur pour les erreurs de connexion credentials (Auth.js v5)
// ============================================================

export const CREDENTIALS_ERROR_MESSAGE =
  "Email ou mot de passe incorrect.";

export const NO_PASSWORD_ERROR_MESSAGE =
  "Ce compte utilise Google. Connectez-vous via Google ou définissez un mot de passe dans vos paramètres.";

export const LOCKOUT_15M_MESSAGE = "Compte verrouillé 15 minutes.";

export const LOCKOUT_1H_MESSAGE =
  "Compte verrouillé 1 heure après de nombreuses tentatives incorrectes.";

export const ACCOUNT_SUSPENDED_MESSAGE =
  "Compte suspendu. Confirmez votre email pour le réactiver.";

export type CredentialsSignInErrorCode =
  | "account_locked"
  | "account_suspended"
  | "no_password"
  | "credentials"
  | "failed_attempts"
  | "unknown";

export type CredentialsSignInMessageTone = "error" | "warning";

export type ParsedCredentialsSignInError = {
  code: CredentialsSignInErrorCode;
  message: string;
  tone: CredentialsSignInMessageTone;
};

type SignInResultLike = {
  ok?: boolean;
  error?: string | null;
  code?: string | null;
  url?: string | null;
};

export function failedAttemptsMessage(attemptsRemaining: number): string {
  if (attemptsRemaining <= 1) {
    return "Email ou mot de passe incorrect. Dernière tentative avant blocage.";
  }
  return `Email ou mot de passe incorrect. ${attemptsRemaining} tentatives restantes avant blocage du compte.`;
}

export function lockedMinutesMessage(minutes: number): string {
  const safeMinutes = Math.max(1, minutes);
  return `Compte temporairement verrouillé. Réessayez dans ${safeMinutes} minute${safeMinutes > 1 ? "s" : ""}.`;
}

export function parseLockoutErrorCode(
  raw: string | null | undefined,
): { type: "locked"; minutes: number } | { type: "failed"; remaining: number } | null {
  if (!raw) return null;
  const normalized = decodeURIComponent(raw);
  if (normalized.startsWith("LOCKED:")) {
    const minutes = Number.parseInt(normalized.slice("LOCKED:".length), 10);
    return { type: "locked", minutes: Number.isFinite(minutes) ? minutes : 15 };
  }
  if (normalized.startsWith("FAILED:")) {
    const remaining = Number.parseInt(normalized.slice("FAILED:".length), 10);
    return { type: "failed", remaining: Number.isFinite(remaining) ? remaining : 0 };
  }
  return null;
}

function errorFromQueryParam(param: string | null): CredentialsSignInErrorCode | null {
  if (!param) return null;
  if (parseLockoutErrorCode(param)) return null;
  if (param === "account_locked" || param === "AccountLocked") return "account_locked";
  if (param === "account_suspended" || param === "AccountSuspended") return "account_suspended";
  if (param === "no_password" || param === "NoPassword") return "no_password";
  if (param === "CredentialsSignin") return "credentials";
  return null;
}

function parseErrorFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://blocktrust.tech");
    return parsed.searchParams.get("code") ?? parsed.searchParams.get("error");
  } catch {
    if (url.includes("LOCKED:") || url.includes("FAILED:")) {
      const match = url.match(/(LOCKED:\d+|FAILED:\d+)/);
      return match?.[1] ?? null;
    }
    if (url.includes("account_locked") || url.includes("AccountLocked")) {
      return "account_locked";
    }
    if (url.includes("no_password") || url.includes("NoPassword")) {
      return "no_password";
    }
    return null;
  }
}

/** Extrait le code d'erreur credentials depuis la réponse signIn(..., { redirect: false }). */
export function parseCredentialsSignInError(
  result: SignInResultLike | null | undefined,
  options?: { extendedLockout?: boolean },
): ParsedCredentialsSignInError {
  const rawCode = result?.code ?? result?.error ?? null;
  const fromUrl = parseErrorFromUrl(result?.url);
  const lockoutParsed = parseLockoutErrorCode(rawCode) ?? parseLockoutErrorCode(fromUrl);

  if (lockoutParsed?.type === "locked") {
    return {
      code: "account_locked",
      message: lockedMinutesMessage(lockoutParsed.minutes),
      tone: "error",
    };
  }

  if (lockoutParsed?.type === "failed") {
    return {
      code: "failed_attempts",
      message: failedAttemptsMessage(lockoutParsed.remaining),
      tone: "warning",
    };
  }

  let code: CredentialsSignInErrorCode = "credentials";
  const fromUrlCode = errorFromQueryParam(fromUrl);

  if (
    rawCode === "account_locked" ||
    rawCode === "AccountLocked" ||
    fromUrlCode === "account_locked"
  ) {
    code = "account_locked";
  } else if (
    rawCode === "account_suspended" ||
    rawCode === "AccountSuspended" ||
    fromUrlCode === "account_suspended"
  ) {
    code = "account_suspended";
  } else if (
    rawCode === "no_password" ||
    rawCode === "NoPassword" ||
    fromUrlCode === "no_password"
  ) {
    code = "no_password";
  } else if (rawCode === "CredentialsSignin" || fromUrlCode === "credentials") {
    code = "credentials";
  } else if (rawCode) {
    code = "unknown";
  }

  return {
    code,
    message: credentialsErrorMessage(code, options?.extendedLockout),
    tone: "error",
  };
}

export function credentialsErrorMessage(
  code: CredentialsSignInErrorCode,
  extendedLockout?: boolean,
): string {
  if (code === "account_locked") {
    return extendedLockout ? LOCKOUT_1H_MESSAGE : LOCKOUT_15M_MESSAGE;
  }
  if (code === "account_suspended") {
    return ACCOUNT_SUSPENDED_MESSAGE;
  }
  if (code === "no_password") {
    return NO_PASSWORD_ERROR_MESSAGE;
  }
  if (code === "failed_attempts") {
    return failedAttemptsMessage(2);
  }
  if (code === "credentials" || code === "unknown") {
    return CREDENTIALS_ERROR_MESSAGE;
  }
  return CREDENTIALS_ERROR_MESSAGE;
}

/** Messages pour ?error= sur /auth/signin (redirect OAuth ou credentials). */
export function oauthOrSignInErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const lockout = parseLockoutErrorCode(code);
  if (lockout?.type === "locked") {
    return lockedMinutesMessage(lockout.minutes);
  }
  if (lockout?.type === "failed") {
    return failedAttemptsMessage(lockout.remaining);
  }
  const map: Record<string, string> = {
    AccessDenied: "Connexion refusée.",
    Verification: "Le lien de vérification a expiré ou a déjà été utilisé.",
    OAuthSignin: "Impossible de démarrer la connexion OAuth.",
    OAuthCallback: "Erreur lors du retour OAuth (callback).",
    OAuthAccountNotLinked:
      "Cet email est déjà enregistré. Utilisez le lien magique, votre mot de passe, ou « Continuer avec Google ».",
    Callback: "Erreur callback (URL ou secret).",
    Default: "Connexion impossible. Réessayez.",
    CredentialsSignin: CREDENTIALS_ERROR_MESSAGE,
    account_locked: LOCKOUT_15M_MESSAGE,
    AccountLocked: LOCKOUT_15M_MESSAGE,
    account_suspended: ACCOUNT_SUSPENDED_MESSAGE,
    AccountSuspended: ACCOUNT_SUSPENDED_MESSAGE,
    no_password: NO_PASSWORD_ERROR_MESSAGE,
    NoPassword: NO_PASSWORD_ERROR_MESSAGE,
  };
  return map[code] ?? "Connexion impossible. Réessayez.";
}
