// lib/registration-validation.ts
// Validation prénom/nom à l'inscription — anti-bots (noms générés).
// ============================================================

export const REGISTRATION_NAME_ERROR = "Veuillez saisir un nom valide";

/** Lettres Unicode, espaces, tirets, apostrophes (Jean-Pierre, O'Brien, محمد). */
const ALLOWED_NAME_PART = /^[\p{L}\s'\-]+$/u;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function letterConsonantVowelCounts(s: string): { consonants: number; vowels: number } {
  const norm = stripDiacritics(s).toLowerCase();
  const vowelSet = new Set("aeiouy");
  let consonants = 0;
  let vowels = 0;
  for (const ch of norm) {
    if (!/[a-z]/.test(ch)) continue;
    if (vowelSet.has(ch)) vowels++;
    else consonants++;
  }
  return { consonants, vowels };
}

/** Partie en écriture latine (ratio consonnes/voyelles ne s'applique qu'à ce cas). */
function hasLatinLetters(s: string): boolean {
  return /[a-zA-ZÀ-ÿ]/.test(stripDiacritics(s));
}

function validateNamePart(part: string): boolean {
  const trimmed = part.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  if (!ALLOWED_NAME_PART.test(trimmed)) return false;

  if (!hasLatinLetters(trimmed)) return true;

  const { consonants, vowels } = letterConsonantVowelCounts(trimmed);
  if (vowels === 0) return false;
  if (consonants / vowels > 4) return false;

  return true;
}

export type RegistrationNameValidation = { ok: true } | { ok: false };

/**
 * Valide prénom et nom séparément.
 * Noms non-latins (arabe, cyrillique, CJK…) : format uniquement, pas de ratio C/V.
 */
export function validateRegistrationNames(
  firstName: string,
  lastName: string,
): RegistrationNameValidation {
  if (!validateNamePart(firstName)) return { ok: false };
  if (!validateNamePart(lastName)) return { ok: false };
  return { ok: true };
}
