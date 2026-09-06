import { describe, expect, it } from "vitest";
import {
  adminClientAccountBadge,
  classifyAdminClientAccount,
  isDefaultVisibleAdminClient,
} from "@/lib/admin-clients-visibility";

describe("classifyAdminClientAccount", () => {
  it("classe ACTIVE visible par défaut", () => {
    const u = { accountStatus: "ACTIVE", email: "jean@example.com", accountDeletionScheduledAt: null };
    expect(classifyAdminClientAccount(u)).toBe("active");
    expect(isDefaultVisibleAdminClient(u)).toBe(true);
  });

  it("masque SUSPENDED, suppression programmée et email deleted_", () => {
    expect(
      isDefaultVisibleAdminClient({
        accountStatus: "SUSPENDED",
        email: "bot@example.com",
        accountDeletionScheduledAt: null,
      }),
    ).toBe(false);
    expect(
      classifyAdminClientAccount({
        accountStatus: "ACTIVE",
        email: "ok@example.com",
        accountDeletionScheduledAt: new Date("2026-10-01"),
      }),
    ).toBe("pending_deletion");
    expect(
      classifyAdminClientAccount({
        accountStatus: "ACTIVE",
        email: "deleted_abc@blocktrust.tech",
        accountDeletionScheduledAt: null,
      }),
    ).toBe("deleted");
  });

  it("badges de statut", () => {
    expect(adminClientAccountBadge("active").label).toBe("ACTIF");
    expect(adminClientAccountBadge("suspended").label).toBe("SUSPENDU");
    expect(adminClientAccountBadge("pending_deletion").label).toBe("SUPPRESSION");
    expect(adminClientAccountBadge("deleted").label).toBe("SUPPRIMÉ");
  });
});
