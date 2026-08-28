import { describe, expect, it } from "vitest";
import {
  CONTACTS_IMPORT_MAX_ROWS,
  contactsCsvTemplate,
  parseContactsCsv,
} from "@/lib/contacts-import";
import { MAX_TTL_HOURS, TTL_PRESETS, normalizeTtlHours } from "@/lib/certificate-verify-token-constants";
import { ONBOARDING_FAQ } from "@/lib/onboarding";

describe("parseContactsCsv", () => {
  it("parse le modèle CSV (en-tête + une ligne)", () => {
    const result = parseContactsCsv(contactsCsvTemplate());
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.email).toBe("jean.dupont@example.com");
    expect(result.rows[0]?.firstName).toBe("Jean");
    expect(result.rows[0]?.lastName).toBe("Dupont");
    expect(result.rows[0]?.company).toBe("Acme SA");
    expect(result.invalid).toBe(0);
    expect(result.duplicates).toBe(0);
  });

  it("accepte un BOM UTF-8 et un séparateur point-virgule", () => {
    const csv = "\uFEFFemail;prénom;nom\nmarie@example.com;Marie;Martin";
    const result = parseContactsCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.email).toBe("marie@example.com");
    expect(result.rows[0]?.firstName).toBe("Marie");
  });

  it("compte les emails invalides et les doublons dans le fichier", () => {
    const csv = [
      "email,prénom,nom",
      "ok@example.com,Ok,Un",
      "pas-un-email,X,Y",
      "ok@example.com,Ok,Deux",
    ].join("\n");
    const result = parseContactsCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.invalid).toBe(1);
    expect(result.duplicates).toBe(1);
  });

  it(`plafonne à ${CONTACTS_IMPORT_MAX_ROWS} contacts`, () => {
    const header = "email,prénom,nom";
    const lines = Array.from({ length: CONTACTS_IMPORT_MAX_ROWS + 10 }, (_, i) =>
      `user${i}@example.com,Prenom,Nom`,
    );
    const result = parseContactsCsv([header, ...lines].join("\n"));
    expect(result.rows).toHaveLength(CONTACTS_IMPORT_MAX_ROWS);
  });
});

describe("TTL liens rotatifs", () => {
  it("autorise 30 jours (720 h) et plafonne au-delà", () => {
    expect(MAX_TTL_HOURS).toBe(720);
    expect(TTL_PRESETS.map((p) => p.hours)).toEqual([1, 24, 168, 720]);
    expect(normalizeTtlHours(720)).toBe(720);
    expect(normalizeTtlHours(10_000)).toBe(720);
  });
});

describe("ONBOARDING_FAQ", () => {
  it("expose les 5 questions du guide contextuel", () => {
    expect(ONBOARDING_FAQ).toHaveLength(5);
    expect(ONBOARDING_FAQ.map((q) => q.question)).toEqual([
      "Comment partager mon badge ?",
      "Comment ajouter un contact ?",
      "C'est quoi le Trust Circle ?",
      "Comment fonctionne le Coffre-fort ?",
      "Comment installer l'extension ?",
    ]);
  });
});
