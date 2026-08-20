import { describe, it, expect } from "vitest";
import {
  REGISTRATION_NAME_ERROR,
  validateRegistrationNames,
} from "@/lib/registration-validation";
import { emailsCanonicallyEqual, normalizeEmail } from "@/lib/email-utils";

describe("validateRegistrationNames", () => {
  it("accepte les noms latins légitimes", () => {
    expect(validateRegistrationNames("Olivier", "Bernabé")).toEqual({ ok: true });
    expect(validateRegistrationNames("Jean-Pierre", "Dupont")).toEqual({ ok: true });
    expect(validateRegistrationNames("Patrick", "O'Brien")).toEqual({ ok: true });
  });

  it("accepte les noms non-latins", () => {
    expect(validateRegistrationNames("محمد", "العربي")).toEqual({ ok: true });
    expect(validateRegistrationNames("Владимир", "Петров")).toEqual({ ok: true });
  });

  it("rejette les noms sans voyelle (latin)", () => {
    expect(validateRegistrationNames("Ccyo", "Rfxdifwx")).toEqual({ ok: false });
    expect(validateRegistrationNames("Txunjppo", "Rfxdifwx")).toEqual({ ok: false });
  });

  it("rejette ratio consonnes/voyelles > 4", () => {
    expect(validateRegistrationNames("Rfxdifwx", "Ab")).toEqual({ ok: false });
  });

  it("rejette prénom ou nom trop court", () => {
    expect(validateRegistrationNames("A", "Dupont")).toEqual({ ok: false });
    expect(validateRegistrationNames("Jean", "B")).toEqual({ ok: false });
  });

  it("rejette caractères interdits", () => {
    expect(validateRegistrationNames("Jean123", "Dupont")).toEqual({ ok: false });
    expect(validateRegistrationNames("Jean@", "Dupont")).toEqual({ ok: false });
  });

  it("expose le message d'erreur standard", () => {
    expect(REGISTRATION_NAME_ERROR).toBe("Veuillez saisir un nom valide");
  });
});

describe("normalizeEmail", () => {
  it("normalise Gmail dot trick et plus addressing", () => {
    expect(normalizeEmail("x.ix.ur.u.pe.r.a.d338@gmail.com")).toBe(
      "xixuruperad338@gmail.com",
    );
    expect(normalizeEmail("user+tag@gmail.com")).toBe("user@gmail.com");
    expect(normalizeEmail("User.Name@GoogleMail.com")).toBe("username@gmail.com");
  });

  it("laisse les autres domaines en lowercase trim", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("détecte l'équivalence canonique Gmail", () => {
    expect(
      emailsCanonicallyEqual("john.doe@gmail.com", "johndoe@gmail.com"),
    ).toBe(true);
    expect(emailsCanonicallyEqual("a@example.com", "b@example.com")).toBe(false);
  });
});
