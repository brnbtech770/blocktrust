import { describe, it, expect } from "vitest";
import {
  filterThirdPartyContactEntities,
  isUserOwnBadgeEntity,
  isUserOwnProfileEntity,
} from "@/lib/entity-contacts";

describe("entity-contacts", () => {
  it("isUserOwnProfileEntity — email identique au compte", () => {
    expect(
      isUserOwnProfileEntity({ email: "User@Example.com" }, "user@example.com"),
    ).toBe(true);
  });

  it("isUserOwnBadgeEntity — badge BUSINESS avec certificat exclu des contacts", () => {
    expect(
      isUserOwnBadgeEntity(
        { email: "contact@winter-keys.com", certificates: [{ id: "c1" }] },
        "laurianne@winter-keys.com",
      ),
    ).toBe(true);
  });

  it("filterThirdPartyContactEntities — exclut profil personnel et badges certifiés", () => {
    const entities = [
      { id: "1", email: "me@example.com", certificates: [] },
      { id: "2", email: "vendor@acme.fr", certificates: [] },
      {
        id: "3",
        email: "pro@company.fr",
        certificates: [{ id: "cert-1" }],
      },
    ];
    const contacts = filterThirdPartyContactEntities(entities, "me@example.com");
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.email).toBe("vendor@acme.fr");
  });
});
