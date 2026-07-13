import { describe, expect, it } from "vitest";
import {
  EMAIL_VERIFICATION_REQUIRED_SINCE,
  isGrandfatheredUser,
  requiresEmailVerification,
} from "@/lib/email-verification";

describe("email-verification", () => {
  it("grandfathering — comptes avant le déploiement", () => {
    expect(
      isGrandfatheredUser({
        createdAt: new Date("2026-01-01"),
        emailVerified: null,
      }),
    ).toBe(true);
  });

  it("requiresEmailVerification — nouveau compte sans emailVerified", () => {
    expect(
      requiresEmailVerification({
        emailVerified: null,
        createdAt: new Date("2026-08-01"),
        accountStatus: "ACTIVE",
      }),
    ).toBe(true);
  });

  it("requiresEmailVerification — faux si emailVerified", () => {
    expect(
      requiresEmailVerification({
        emailVerified: new Date(),
        createdAt: new Date("2026-08-01"),
        accountStatus: "ACTIVE",
      }),
    ).toBe(false);
  });

  it("EMAIL_VERIFICATION_REQUIRED_SINCE est défini", () => {
    expect(EMAIL_VERIFICATION_REQUIRED_SINCE).toBeInstanceOf(Date);
  });
});
