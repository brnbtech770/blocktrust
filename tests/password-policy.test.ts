import { describe, it, expect } from "vitest";
import { validatePassword, getPasswordStrength, passwordStrengthLabel } from "@/lib/password-policy";

describe("password-policy", () => {
  it("accepte un mot de passe fort valide", () => {
    const result = validatePassword("BlockTrust9!", "user@example.com");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejette un mot de passe trop court", () => {
    const result = validatePassword("Ab1!");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("8 caractères"))).toBe(true);
  });

  it("rejette les mots de passe courants", () => {
    const result = validatePassword("123456", "other@example.com");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("courant"))).toBe(true);
  });

  it("rejette un mot de passe identique à la partie locale de l'email", () => {
    const result = validatePassword("jean.dupont", "jean.dupont@example.com");
    expect(result.valid).toBe(false);
  });

  it("calcule la force du mot de passe", () => {
    expect(getPasswordStrength("abc")).toBe("weak");
    expect(getPasswordStrength("Abcdefgh1!")).toBe("strong");
    expect(getPasswordStrength("BlockTrust9!Secure")).toBe("strong");
    expect(passwordStrengthLabel("strong")).toBe("Fort");
  });
});
