import { describe, it, expect } from "vitest";
import { DELETION_GRACE_DAYS, getDeletionScheduledDate } from "@/lib/account-deletion";

describe("account-deletion", () => {
  it("programme la suppression à J+30", () => {
    const from = new Date("2026-06-01T12:00:00.000Z");
    const scheduled = getDeletionScheduledDate(from);
    expect(DELETION_GRACE_DAYS).toBe(30);
    const expected = new Date(from);
    expected.setDate(expected.getDate() + 30);
    expect(scheduled.toISOString()).toBe(expected.toISOString());
  });

  it("utilise la date courante par défaut", () => {
    const before = Date.now();
    const scheduled = getDeletionScheduledDate();
    const after = Date.now();
    const expectedMin = before + DELETION_GRACE_DAYS * 86_400_000;
    const expectedMax = after + DELETION_GRACE_DAYS * 86_400_000;
    expect(scheduled.getTime()).toBeGreaterThanOrEqual(expectedMin - 1000);
    expect(scheduled.getTime()).toBeLessThanOrEqual(expectedMax + 1000);
  });
});
