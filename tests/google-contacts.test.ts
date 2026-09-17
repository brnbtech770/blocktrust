import { describe, expect, it } from "vitest";
import {
  GOOGLE_CONTACTS_READONLY_SCOPE,
  GOOGLE_LOGIN_SCOPES,
  buildGoogleContactsAuthUrl,
  exchangeGoogleContactsCode,
  fetchGoogleContactsPreview,
  mapGooglePeopleToContacts,
  mapGooglePersonToContact,
  selectGoogleContactsByIds,
} from "@/lib/google-contacts";
import { CONTACTS_IMPORT_MAX_ROWS } from "@/lib/contacts-import";

describe("Google Contacts OAuth scopes", () => {
  it("sépare le login du scope People API lecture seule", () => {
    expect(GOOGLE_LOGIN_SCOPES).toBe("openid email profile");
    expect(GOOGLE_LOGIN_SCOPES).not.toContain("contacts");
    expect(GOOGLE_CONTACTS_READONLY_SCOPE).toBe(
      "https://www.googleapis.com/auth/contacts.readonly",
    );
    expect(GOOGLE_CONTACTS_READONLY_SCOPE).not.toContain("contacts.write");
  });

  it("construit une URL OAuth one-shot sans refresh token", () => {
    const url = buildGoogleContactsAuthUrl({
      clientId: "cid",
      state: "st",
      codeChallenge: "ch",
      redirectUri: "https://blocktrust.tech/api/contacts/google/callback",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("scope")).toBe(GOOGLE_CONTACTS_READONLY_SCOPE);
    expect(parsed.searchParams.get("access_type")).toBe("online");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("include_granted_scopes")).toBe("true");
  });
});

describe("mapGooglePersonToContact", () => {
  it("ignore un contact sans email", () => {
    expect(
      mapGooglePersonToContact({
        resourceName: "people/c1",
        names: [{ givenName: "Jean", familyName: "Dupont" }],
      }),
    ).toBeNull();
  });

  it("mappe nom, email, téléphone et organisation", () => {
    const mapped = mapGooglePersonToContact({
      resourceName: "people/c1",
      names: [{ givenName: "Jean", familyName: "Dupont", metadata: { primary: true } }],
      emailAddresses: [{ value: "jean@example.com", metadata: { primary: true } }],
      phoneNumbers: [{ value: "0612345678" }],
      organizations: [{ name: "Acme SA" }],
    });
    expect(mapped).toEqual({
      id: "people/c1",
      email: "jean@example.com",
      firstName: "Jean",
      lastName: "Dupont",
      phone: "0612345678",
      company: "Acme SA",
    });
  });

  it("déduplique par email et plafonne à 500", () => {
    const people = Array.from({ length: CONTACTS_IMPORT_MAX_ROWS + 20 }, (_, i) => ({
      resourceName: `people/c${i}`,
      emailAddresses: [{ value: `user${i}@example.com` }],
      names: [{ givenName: "A", familyName: "B" }],
    }));
    people.push({
      resourceName: "people/dup",
      emailAddresses: [{ value: "user0@example.com" }],
      names: [{ givenName: "A", familyName: "B" }],
    });
    const mapped = mapGooglePeopleToContacts(people);
    expect(mapped).toHaveLength(CONTACTS_IMPORT_MAX_ROWS);
    expect(mapped[0]?.id).toBe("people/c0");
  });
});

describe("selectGoogleContactsByIds", () => {
  const preview = [
    {
      id: "people/c1",
      email: "a@example.com",
      firstName: "A",
      lastName: "Un",
      phone: null,
      company: null,
    },
    {
      id: "people/c2",
      email: "b@example.com",
      firstName: "B",
      lastName: "Deux",
      phone: null,
      company: null,
    },
  ];

  it("ne fait confiance qu'aux ids présents dans la preview", () => {
    const selected = selectGoogleContactsByIds(preview, ["people/c2", "people/unknown", 12]);
    expect(selected).toHaveLength(1);
    expect(selected[0]?.email).toBe("b@example.com");
  });
});

describe("People API fetch", () => {
  it("lit names, emails, phones, organizations", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          connections: [
            {
              resourceName: "people/c1",
              names: [{ givenName: "Marie", familyName: "Martin" }],
              emailAddresses: [{ value: "marie@example.com" }],
            },
          ],
        }),
        { status: 200 },
      );

    const contacts = await fetchGoogleContactsPreview("token", fetchImpl);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.email).toBe("marie@example.com");
  });

  it("échange le code et ignore un refresh_token éventuel", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          access_token: "access-only",
          refresh_token: "must-not-be-returned",
        }),
        { status: 200 },
      );

    const result = await exchangeGoogleContactsCode({
      code: "code",
      verifier: "ver",
      redirectUri: "https://blocktrust.tech/api/contacts/google/callback",
      clientId: "cid",
      clientSecret: "sec",
      fetchImpl,
    });
    expect(result).toEqual({ accessToken: "access-only" });
    expect(result).not.toHaveProperty("refresh_token");
  });
});
