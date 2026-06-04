/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// app/lib/cookie-consent.ts
// Util client partagé pour le consentement cookies (CNIL / ePrivacy).
//
// Catégories :
//   - Essentiels : toujours actifs, non désactivables (fonctionnement du service).
//   - Mesure d'audience : Vercel Analytics / SpeedInsights, OFF par défaut.
//
// Stockage : localStorage (PAS un cookie → aucune durée de cookie > 13 mois créée).
// Le choix est re-demandé s'il est absent ou daté de plus de 6 mois.
// ============================================================

/** Clé v2 : invalide volontairement l'ancien format binaire 'accepted'/'rejected'. */
export const CONSENT_STORAGE_KEY = 'blocktrust_cookie_consent_v2'

/** Émis quand le choix de consentement change (pour re-gater les scripts). */
export const CONSENT_CHANGED_EVENT = 'blocktrust:cookie-consent-changed'

/** Émis par le lien "Gestion des cookies" du footer pour rouvrir le panneau. */
export const CONSENT_OPEN_SETTINGS_EVENT = 'blocktrust:open-cookie-settings'

/** Durée de validité du choix : ~6 mois (180 jours). Au-delà → re-demander. */
export const CONSENT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180

export interface CookieConsent {
  /** Mesure d'audience (Vercel Analytics / SpeedInsights). Les essentiels sont implicites. */
  analytics: boolean
  /** Date du choix (ms epoch), sert au contrôle d'expiration. */
  ts: number
}

/**
 * Lit le consentement valide (non expiré). Retourne null si absent, invalide
 * ou périmé (> 6 mois) → la bannière doit alors être ré-affichée.
 */
export function readConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CookieConsent>
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.ts !== 'number') {
      return null
    }
    if (Date.now() - parsed.ts > CONSENT_MAX_AGE_MS) return null
    return { analytics: parsed.analytics, ts: parsed.ts }
  } catch {
    return null
  }
}

/** Enregistre le choix localement et notifie les écouteurs (gating temps réel). */
export function writeConsent(analytics: boolean): CookieConsent {
  const value: CookieConsent = { analytics, ts: Date.now() }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* localStorage indisponible : le gating restera simplement OFF */
    }
    window.dispatchEvent(
      new CustomEvent<CookieConsent>(CONSENT_CHANGED_EVENT, { detail: value }),
    )
  }
  return value
}

/** Déclenche la réouverture du panneau de paramétrage (depuis le footer). */
export function openCookieSettings(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONSENT_OPEN_SETTINGS_EVENT))
  }
}
