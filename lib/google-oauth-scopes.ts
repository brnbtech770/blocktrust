// Scopes OAuth Google — login vs import contacts (People API, lecture seule).
// ============================================================

/** Login NextAuth uniquement. Ne jamais y coller contacts.readonly. */
export const GOOGLE_LOGIN_SCOPES = "openid email profile";

/** People API — lecture seule, jamais d'écriture dans le carnet Google. */
export const GOOGLE_CONTACTS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/contacts.readonly";
