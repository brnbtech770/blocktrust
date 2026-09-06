import { describe, it, expect } from "vitest";
import {
  REGISTRATION_NAME_ERROR,
  hasExcessiveConsecutiveConsonants,
  isGibberishDisplayName,
  latinTokenPhoneticFail,
  validateRegistrationNames,
} from "@/lib/registration-validation";
import { emailsCanonicallyEqual, normalizeEmail } from "@/lib/email-utils";

describe("validateRegistrationNames", () => {
  it("accepte les noms latins légitimes", () => {
    expect(validateRegistrationNames("Olivier", "Bernabé")).toEqual({ ok: true });
    expect(validateRegistrationNames("Jean-Pierre", "Dupont")).toEqual({ ok: true });
    expect(validateRegistrationNames("Patrick", "O'Brien")).toEqual({ ok: true });
    expect(validateRegistrationNames("Anna", "Mc Donald")).toEqual({ ok: true });
    expect(validateRegistrationNames("Christian", "Strauss")).toEqual({ ok: true });
    expect(validateRegistrationNames("Hans", "Schmidt")).toEqual({ ok: true });
    expect(validateRegistrationNames("Béatrice", "François")).toEqual({ ok: true });
    expect(validateRegistrationNames("Jörg", "Müller")).toEqual({ ok: true });
    expect(validateRegistrationNames("Li", "Wu")).toEqual({ ok: true });
    expect(validateRegistrationNames("Al", "Hassan")).toEqual({ ok: true });
  });

  it("accepte les noms non-latins", () => {
    expect(validateRegistrationNames("محمد", "العربي")).toEqual({ ok: true });
    expect(validateRegistrationNames("Владимир", "Петров")).toEqual({ ok: true });
    expect(validateRegistrationNames("李明", "王伟")).toEqual({ ok: true });
  });

  it("rejette les paires bot (prénom ET nom suspects)", () => {
    expect(validateRegistrationNames("Rxhogkyr", "Drbubaw")).toEqual({ ok: false });
    expect(validateRegistrationNames("Oxptulvw", "Exhgh")).toEqual({ ok: false });
    expect(validateRegistrationNames("Ycjkdev", "Dkovc")).toEqual({ ok: false });
    expect(validateRegistrationNames("Gcnuu", "Kzhaexrw")).toEqual({ ok: false });
    expect(validateRegistrationNames("Catx", "Msgltwemi")).toEqual({ ok: false });
    expect(validateRegistrationNames("Txunjppo", "Rfxdifwx")).toEqual({ ok: false });
  });

  it("autorise un seul champ suspect (bénéfice du doute)", () => {
    expect(validateRegistrationNames("Rxhogkyr", "Dupont")).toEqual({ ok: true });
    expect(validateRegistrationNames("Olivier", "Drbubaw")).toEqual({ ok: true });
    expect(validateRegistrationNames("Qxheok", "Ouxoceju")).toEqual({ ok: true });
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

describe("latinTokenPhoneticFail / ratio 2.5 et consonnes d'affilée", () => {
  it("ratio Olivier 0.75 et Jean-Pierre OK, Rxhogkyr 3.0 suspect", () => {
    expect(latinTokenPhoneticFail("Olivier")).toBe(false);
    expect(latinTokenPhoneticFail("Jean")).toBe(false);
    expect(latinTokenPhoneticFail("Pierre")).toBe(false);
    expect(latinTokenPhoneticFail("Rxhogkyr")).toBe(true);
  });

  it("Schmidt (ratio élevé) est rattrapé par un prénom normal", () => {
    expect(latinTokenPhoneticFail("Schmidt")).toBe(true);
    expect(validateRegistrationNames("Hans", "Schmidt")).toEqual({ ok: true });
  });

  it("max 3 consonnes : chr/str OK, rxh et msgltw suspects", () => {
    expect(hasExcessiveConsecutiveConsonants("Christian")).toBe(false);
    expect(hasExcessiveConsecutiveConsonants("Strauss")).toBe(false);
    expect(hasExcessiveConsecutiveConsonants("Rxhogkyr")).toBe(true);
    expect(hasExcessiveConsecutiveConsonants("Msgltwemi")).toBe(true);
  });
});

describe("isGibberishDisplayName", () => {
  it("détecte les noms stockés « Prénom Nom » bots", () => {
    expect(isGibberishDisplayName("Rxhogkyr Drbubaw")).toBe(true);
    expect(isGibberishDisplayName("Oxptulvw Exhgh")).toBe(true);
    expect(isGibberishDisplayName("Ycjkdev Dkovc")).toBe(true);
    expect(isGibberishDisplayName("Gcnuu Kzhaexrw")).toBe(true);
    expect(isGibberishDisplayName("Catx Msgltwemi")).toBe(true);
    expect(isGibberishDisplayName("Olivier Bernabé")).toBe(false);
    expect(isGibberishDisplayName(null)).toBe(false);
    expect(isGibberishDisplayName("X")).toBe(false);
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
