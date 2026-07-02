// lib/password-policy.ts
// Politique de complexité mot de passe BLOCKTRUST™
// ============================================================

import { isCommonPassword } from "@/lib/common-passwords";

const SPECIAL_CHARS = /[@#$%^&*!?.,;:]/;

export type PasswordValidationResult = {
  valid: boolean;
  errors: string[];
};

export type PasswordStrength = "weak" | "medium" | "strong";

export function validatePassword(
  password: string,
  email?: string | null,
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une minuscule");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  if (!SPECIAL_CHARS.test(password)) {
    errors.push(
      "Le mot de passe doit contenir au moins un caractère spécial (@#$%^&*!?.,;:)",
    );
  }
  if (isCommonPassword(password)) {
    errors.push("Ce mot de passe est trop courant — choisissez-en un autre");
  }
  if (email) {
    const local = email.split("@")[0]?.trim().toLowerCase();
    if (local && local.length >= 3 && password.toLowerCase().includes(local)) {
      errors.push("Le mot de passe ne doit pas contenir votre adresse email");
    }
    if (local && password.toLowerCase() === local) {
      errors.push("Le mot de passe ne doit pas être identique à votre email");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "weak";

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (SPECIAL_CHARS.test(password)) score += 1;
  if (!isCommonPassword(password) && password.length >= 10) score += 1;

  if (score >= 5) return "strong";
  if (score >= 3) return "medium";
  return "weak";
}

export function passwordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case "strong":
      return "Fort";
    case "medium":
      return "Moyen";
    default:
      return "Faible";
  }
}
