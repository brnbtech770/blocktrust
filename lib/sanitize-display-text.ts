// lib/sanitize-display-text.ts
// Champs affichés côté client (extensions, tooltips) — rejet / assainissement HTML.
// ============================================================

/** Caractères / motifs dangereux pour innerHTML ou injection de markup. */
const UNSAFE_DISPLAY_PATTERN =
  /[<>&]|javascript\s*:|data\s*:|on\w+\s*=|&#x?[0-9a-f]+;|&#[0-9]+;/i;

/**
 * Détecte une tentative d'injection HTML/JS dans un libellé affiché.
 */
export function containsUnsafeDisplayMarkup(value: string): boolean {
  return UNSAFE_DISPLAY_PATTERN.test(value);
}

/**
 * Retire les balises HTML et normalise les espaces (défense en profondeur côté API).
 */
export function sanitizeDisplayText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const stripped = value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return null;
  if (containsUnsafeDisplayMarkup(stripped)) {
    return stripped.replace(/[<>&]/g, "");
  }
  return stripped;
}

export type SafeDisplayTextResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

/**
 * Valide un libellé à la saisie (PATCH entité, etc.).
 */
export function assertSafeDisplayText(
  value: string,
  fieldLabel: string,
): SafeDisplayTextResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, reason: `${fieldLabel} requis.` };
  }
  if (containsUnsafeDisplayMarkup(trimmed)) {
    return {
      ok: false,
      reason: `${fieldLabel} : caractères non autorisés (<, >, &, scripts).`,
    };
  }
  return { ok: true, value: trimmed };
}
