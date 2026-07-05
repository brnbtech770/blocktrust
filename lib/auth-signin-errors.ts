// lib/auth-signin-errors.ts
// Messages utilisateur pour les erreurs de connexion credentials (Auth.js v5)
// ============================================================

export const CREDENTIALS_ERROR_MESSAGE =
  "Email ou mot de passe incorrect.";

export const NO_PASSWORD_ERROR_MESSAGE =
  "Connectez-vous via Google, le lien magique, ou définissez un mot de passe via « Mot de passe oublié ».";

export const LOCKOUT_15M_MESSAGE =
  "Compte verrouillé 15 minutes après plusieurs tentatives incorrectes.";

export const LOCKOUT_1H_MESSAGE =
  "Compte verrouillé 1 heure après de nombreuses tentatives incorrectes.";

export type CredentialsSignInErrorCode =
  | "account_locked"
  | "no_password"
  | "credentials"
  | "unknown";

export type ParsedCredentialsSignInError = {
  code: CredentialsSignInErrorCode;
  message: string;
};

type SignInResultLike = {
  ok?: boolean;
  error?: string | null;
  code?: string | null;
  url?: string | null;
};

function errorFromQueryParam(param: string | null): CredentialsSignInErrorCode | null {
  if (!param) return null;
  if (param === "account_locked" || param === "AccountLocked") return "account_locked";
  if (param === "no_password" || param === "NoPassword") return "no_password";
  if (param === "CredentialsSignin") return "credentials";
  return null;
}

function parseErrorFromUrl(url: string | null | undefined): CredentialsSignInErrorCode | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://blocktrust.tech");
    return errorFromQueryParam(parsed.searchParams.get("error"));
  } catch {
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

  let code: CredentialsSignInErrorCode = "credentials";

  if (
    rawCode === "account_locked" ||
    rawCode === "AccountLocked" ||
    fromUrl === "account_locked"
  ) {
    code = "account_locked";
  } else if (
    rawCode === "no_password" ||
    rawCode === "NoPassword" ||
    fromUrl === "no_password"
  ) {
    code = "no_password";
  } else if (rawCode === "CredentialsSignin" || fromUrl === "credentials") {
    code = "credentials";
  } else if (rawCode) {
    code = "unknown";
  }

  return {
    code,
    message: credentialsErrorMessage(code, options?.extendedLockout),
  };
}

export function credentialsErrorMessage(
  code: CredentialsSignInErrorCode,
  extendedLockout?: boolean,
): string {
  if (code === "account_locked") {
    return extendedLockout ? LOCKOUT_1H_MESSAGE : LOCKOUT_15M_MESSAGE;
  }
  if (code === "no_password") {
    return NO_PASSWORD_ERROR_MESSAGE;
  }
  if (code === "credentials" || code === "unknown") {
    return CREDENTIALS_ERROR_MESSAGE;
  }
  return CREDENTIALS_ERROR_MESSAGE;
}

/** Messages pour ?error= sur /auth/signin (redirect OAuth ou credentials). */
export function oauthOrSignInErrorMessage(code: string | null): string | null {
  if (!code) return null;
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
    no_password: NO_PASSWORD_ERROR_MESSAGE,
    NoPassword: NO_PASSWORD_ERROR_MESSAGE,
  };
  return map[code] ?? "Connexion impossible. Réessayez.";
}
