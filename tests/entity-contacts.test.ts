import { describe, it, expect } from "vitest";
import {
  filterThirdPartyContactEntities,
  isUserOwnProfileEntity,
} from "@/lib/entity-contacts";

describe("entity-contacts", () => {
  it("isUserOwnProfileEntity — email identique au compte", () => {
    expect(
      isUserOwnProfileEntity({ email: "User@Example.com" }, "user@example.com"),
    ).toBe(true);
  });

  it("filterThirdPartyContactEntities — exclut le profil personnel", () => {
    const entities = [
      { id: "1", email: "me@example.com" },
      { id: "2", email: "vendor@acme.fr" },
    ];
    const contacts = filterThirdPartyContactEntities(entities, "me@example.com");
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.email).toBe("vendor@acme.fr");
  });
});
