// lib/registration-validation.ts
// Validation prénom/nom à l'inscription — anti-bots (noms générés).
// ============================================================

export const REGISTRATION_NAME_ERROR = "Veuillez saisir un nom valide";

/** Ratio consonnes/voyelles au-dessus duquel un jeton latin est suspect. */
export const MAX_CONSONANT_VOWEL_RATIO = 2.5;

/** Plus de 3 consonnes d'affilée → suspect (3 OK si cluster légitime : chr, str, sch). */
export const MAX_CONSECUTIVE_CONSONANTS = 3;

/** Lettres Unicode, espaces, tirets, apostrophes (Jean-Pierre, O'Brien, محمد). */
const ALLOWED_NAME_PART = /^[\p{L}\s'\-]+$/u;

const VOWELS = new Set("aeiouy");

/** Clusters consonantiques courants (FR/EN/DE) — 3 lettres ne sont pas du gibberish. */
const COMMON_CONSONANT_CLUSTERS = new Set([
  "ch",
  "ck",
  "ph",
  "th",
  "sh",
  "wh",
  "qu",
  "ng",
  "st",
  "ns",
  "rs",
  "ls",
  "nd",
  "chr",
  "sch",
  "str",
  "spr",
  "spl",
  "scr",
  "shr",
  "thr",
  "phr",
  "chl",
  "tch",
  "ght",
  "nch",
  "rch",
  "lch",
  "nst",
  "rst",
  "cks",
  "dge",
]);

const NAME_PARTICLES = new Set([
  "de",
  "da",
  "di",
  "du",
  "des",
  "van",
  "von",
  "del",
  "der",
  "den",
  "ter",
  "ten",
  "bin",
  "al",
  "el",
  "la",
  "le",
  "mc",
  "mac",
  "st",
  "ben",
]);

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function letterConsonantVowelCounts(s: string): { consonants: number; vowels: number } {
  const norm = stripDiacritics(s).toLowerCase();
  let consonants = 0;
  let vowels = 0;
  for (const ch of norm) {
    if (!/[a-z]/.test(ch)) continue;
    if (VOWELS.has(ch)) vowels++;
    else consonants++;
  }
  return { consonants, vowels };
}

/** Partie en écriture latine (ratio / consonnes d'affilée uniquement dans ce cas). */
function hasLatinLetters(s: string): boolean {
  return /[a-zA-ZÀ-ÿ]/.test(stripDiacritics(s));
}

function isParticleToken(token: string): boolean {
  const n = stripDiacritics(token).toLowerCase();
  if (NAME_PARTICLES.has(n)) return true;
  if (n.length <= 3 && letterConsonantVowelCounts(n).vowels === 0) return true;
  return false;
}

function consecutiveConsonantRunFails(run: string): boolean {
  if (run.length === MAX_CONSECUTIVE_CONSONANTS) {
    return !COMMON_CONSONANT_CLUSTERS.has(run);
  }
  if (run.length > MAX_CONSECUTIVE_CONSONANTS) {
    if (run.length === 4) {
      const head = run.slice(0, 3);
      const tail = run.slice(1, 4);
      if (COMMON_CONSONANT_CLUSTERS.has(head) || COMMON_CONSONANT_CLUSTERS.has(tail)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/** Plus de 3 consonnes d'affilée, ou 3 hors cluster légitime (chr/str/sch). */
export function hasExcessiveConsecutiveConsonants(s: string): boolean {
  const norm = stripDiacritics(s).toLowerCase();
  let run = "";
  for (const ch of norm) {
    if (!/[a-z]/.test(ch)) continue;
    if (VOWELS.has(ch)) {
      if (consecutiveConsonantRunFails(run)) return true;
      run = "";
    } else {
      run += ch;
    }
  }
  return consecutiveConsonantRunFails(run);
}

export function latinTokenPhoneticFail(token: string): boolean {
  if (!hasLatinLetters(token)) return false;
  if (isParticleToken(token)) return false;
  const { consonants, vowels } = letterConsonantVowelCounts(token);
  if (vowels === 0) return true;
  const norm = stripDiacritics(token);
  const applyRatio = norm.length >= 5 || /[xqXQ]/.test(norm);
  if (applyRatio && consonants / vowels > MAX_CONSONANT_VOWEL_RATIO) return true;
  if (hasExcessiveConsecutiveConsonants(token)) return true;
  return false;
}

function fieldPhoneticFail(field: string): boolean {
  const tokens = field.split(/[\s'\-]+/).filter(Boolean);
  const checked = tokens.filter(
    (t) => hasLatinLetters(t) && !isParticleToken(t) && t.length >= 2,
  );
  if (checked.length === 0) return false;
  return checked.some((t) => latinTokenPhoneticFail(t));
}

function fieldStructuralOk(field: string): boolean {
  const trimmed = field.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  if (!ALLOWED_NAME_PART.test(trimmed)) return false;
  return true;
}

export type RegistrationNameValidation = { ok: true } | { ok: false };

/**
 * Valide prénom et nom.
 * Structure (longueur, charset) : chaque champ.
 * Ratio / consonnes d'affilée : rejet seulement si LES DEUX champs sont suspects.
 * Noms non-latins : format uniquement.
 */
export function validateRegistrationNames(
  firstName: string,
  lastName: string,
): RegistrationNameValidation {
  if (!fieldStructuralOk(firstName) || !fieldStructuralOk(lastName)) {
    return { ok: false };
  }
  if (fieldPhoneticFail(firstName) && fieldPhoneticFail(lastName)) {
    return { ok: false };
  }
  return { ok: true };
}

export function splitRegistrationDisplayName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const t = (name ?? "").trim().replace(/\s+/g, " ");
  if (!t) return { firstName: "", lastName: "" };
  const space = t.indexOf(" ");
  if (space === -1) return { firstName: t, lastName: t };
  return { firstName: t.slice(0, space), lastName: t.slice(space + 1) };
}

/** Compte existant : le nom affiché échoue les mêmes règles que l'inscription. */
export function isGibberishDisplayName(name: string | null | undefined): boolean {
  const { firstName, lastName } = splitRegistrationDisplayName(name);
  if (firstName.length < 2 || lastName.length < 2) return false;
  return !validateRegistrationNames(firstName, lastName).ok;
}
