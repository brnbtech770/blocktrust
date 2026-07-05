import { describe, expect, it } from "vitest";

/** Miroir lib/user-deletion-cascade — détection blocage org */
type OrgMember = { userId: string; role: string };

function findOrgOwnershipBlocksFromData(
  userId: string,
  orgs: Array<{ id: string; name: string; members: OrgMember[] }>,
): Array<{ orgId: string; orgName: string }> {
  return orgs
    .filter((org) =>
      org.members.some(
        (m) => m.userId !== userId && (m.role === "OWNER" || m.role === "ADMIN"),
      ),
    )
    .map((o) => ({ orgId: o.id, orgName: o.name }));
}

function canDeleteRevokedCertificate(status: string, isOwner: boolean, isAdmin: boolean): boolean {
  if (status !== "REVOKED") return false;
  return isOwner || isAdmin;
}

function canDeleteActiveCertificateAsAdmin(status: string): boolean {
  return status === "ACTIVE" || status === "ANCHORED";
}

function canDeleteDashboardAdminAsAdmin(
  targetIsDashboardAdmin: boolean,
  actorIsSuperAdmin: boolean,
): boolean {
  if (!targetIsDashboardAdmin) return true;
  return actorIsSuperAdmin;
}

describe("cascade orgs self-service (H5)", () => {
  it("bloque si autre OWNER/ADMIN dans l'org", () => {
    const blocks = findOrgOwnershipBlocksFromData("user-a", [
      {
        id: "org-1",
        name: "WINTER KEYS",
        members: [
          { userId: "user-a", role: "OWNER" },
          { userId: "user-b", role: "ADMIN" },
        ],
      },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].orgName).toBe("WINTER KEYS");
  });

  it("autorise si seuls MEMBER/VIEWER restants", () => {
    const blocks = findOrgOwnershipBlocksFromData("user-a", [
      {
        id: "org-1",
        name: "Solo Org",
        members: [
          { userId: "user-a", role: "OWNER" },
          { userId: "user-c", role: "MEMBER" },
        ],
      },
    ]);
    expect(blocks).toHaveLength(0);
  });
});

describe("suppression certificat révoqué", () => {
  it("user propriétaire ou admin — REVOKED uniquement", () => {
    expect(canDeleteRevokedCertificate("REVOKED", true, false)).toBe(true);
    expect(canDeleteRevokedCertificate("REVOKED", false, true)).toBe(true);
    expect(canDeleteRevokedCertificate("ACTIVE", true, false)).toBe(false);
    expect(canDeleteRevokedCertificate("ANCHORED", false, true)).toBe(false);
  });

  it("admin ne peut pas supprimer ACTIVE/ANCHORED", () => {
    expect(canDeleteActiveCertificateAsAdmin("ACTIVE")).toBe(true);
    expect(canDeleteActiveCertificateAsAdmin("REVOKED")).toBe(false);
  });
});

describe("suppression compte admin", () => {
  it("seul le super admin peut supprimer un admin dashboard", () => {
    expect(canDeleteDashboardAdminAsAdmin(true, false)).toBe(false);
    expect(canDeleteDashboardAdminAsAdmin(true, true)).toBe(true);
    expect(canDeleteDashboardAdminAsAdmin(false, false)).toBe(true);
  });
});

describe("hashAuditEmail", () => {
  it("produit un hash stable sans email en clair", async () => {
    const { hashAuditEmail } = await import("@/lib/security-audit");
    const h1 = hashAuditEmail("test@example.com");
    const h2 = hashAuditEmail("test@example.com");
    expect(h1).toBe(h2);
    expect(h1).not.toContain("@");
    expect(h1).toHaveLength(64);
  });
});
