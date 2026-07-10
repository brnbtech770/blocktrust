// lib/register-signin.ts
// Vérification post-inscription : session credentials = email inscrit
// ============================================================

export const REGISTER_SIGNIN_FALLBACK_MESSAGE = "Compte créé. Connectez-vous.";

type SessionLike = {
  user?: {
    email?: string | null;
  } | null;
} | null | undefined;

/** True si la session active correspond à l'email nouvellement inscrit. */
export function isSessionForRegisteredEmail(
  session: SessionLike,
  emailNorm: string,
): boolean {
  const sessionEmail = session?.user?.email?.trim().toLowerCase() ?? "";
  return sessionEmail.length > 0 && sessionEmail === emailNorm;
}
