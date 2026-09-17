import { describe, expect, it } from "vitest";
import { getB2BCompareTable, getB2CCompareTable } from "@/lib/pricing-compare";
import { FAMILLE_INCLUDED_PROFILES, FAMILLE_MAX_PROFILES, TEAM_SEATS_MAX } from "@/lib/pricing";

describe("tableau comparatif /pricing", () => {
  it("affiche le wording Famille contacts / profils + Trust Circle / BIS", () => {
    const table = getB2CCompareTable();
    const contacts = table.rows.find((row) => row.label === "Contacts");
    const profiles = table.rows.find((row) => row.label === "Profils");
    const trust = table.rows.find((row) => row.label === "Trust Circle");
    const bis = table.rows.find((row) => row.label === "Signatures BIS");

    expect(contacts?.cells.FAMILLE).toBe("200 partagés + 50 / profil");
    expect(profiles?.cells.FAMILLE).toBe(
      `${FAMILLE_INCLUDED_PROFILES} inclus (jusqu'à ${FAMILLE_MAX_PROFILES})`,
    );
    expect(trust?.cells.FAMILLE).toBe("yes");
    expect(bis?.cells.FAMILLE).toBe("yes");
  });

  it("aligne Team / Entreprise sur 11+ et le wording Vault Team", () => {
    const table = getB2BCompareTable();
    const users = table.rows.find((row) => row.label === "Utilisateurs");
    const contacts = table.rows.find((row) => row.label === "Contacts");

    expect(users?.cells.ENTERPRISE).toBe(`${TEAM_SEATS_MAX + 1}+`);
    expect(contacts?.cells.TEAM).toBe(
      "Vault Illimité + 100 contacts de confiance / utilisateur",
    );
  });
});
