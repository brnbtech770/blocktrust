import { describe, expect, it } from "vitest";
import {
  buildOfficialTrustEngineResult,
  buildRevokedOfficialTrustEngineResult,
  isOfficialRootOfTrustEmail,
  isOfficialRootOfTrustEntity,
  OFFICIAL_SITE_ENTITY_EMAIL,
  OFFICIAL_TRUST_SCORE,
} from "@/lib/official-trust";

describe("official-trust Root of Trust", () => {
  it("reconnaît les emails internes et l'entité officielle du site", () => {
    expect(isOfficialRootOfTrustEmail("brnbtech@gmail.com")).toBe(true);
    expect(isOfficialRootOfTrustEmail("brnbimmo@gmail.com")).toBe(true);
    expect(isOfficialRootOfTrustEmail(OFFICIAL_SITE_ENTITY_EMAIL)).toBe(true);
    expect(isOfficialRootOfTrustEmail("random@example.com")).toBe(false);
  });

  it("résout l'entité via email entité ou propriétaire", () => {
    expect(
      isOfficialRootOfTrustEntity("contact@example.com", "brnbtech@gmail.com"),
    ).toBe(true);
    expect(
      isOfficialRootOfTrustEntity(OFFICIAL_SITE_ENTITY_EMAIL, null),
    ).toBe(true);
    expect(isOfficialRootOfTrustEntity("user@gmail.com", "user@gmail.com")).toBe(
      false,
    );
  });

  it("buildOfficialTrustEngineResult → score 100 stable", () => {
    const r = buildOfficialTrustEngineResult();
    expect(r.globalScore).toBe(OFFICIAL_TRUST_SCORE);
    expect(r.identityScore).toBe(100);
    expect(r.isOfficialAccount).toBe(true);
    expect(r.recommendation).toBe("TRUST");
  });

  it("buildRevokedOfficialTrustEngineResult → score 0", () => {
    const r = buildRevokedOfficialTrustEngineResult();
    expect(r.globalScore).toBe(0);
    expect(r.isOfficialAccount).toBe(false);
    expect(r.recommendation).toBe("DANGER");
  });
});
