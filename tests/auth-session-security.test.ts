import { describe, expect, it } from "vitest";
import { evaluateSessionSecurity } from "@/lib/auth-session-security";

const active = {
  sessionVersion: 2,
  email: "jean@example.com",
  accountStatus: "ACTIVE",
};

describe("evaluateSessionSecurity", () => {
  it("fail-open si Neon / Prisma injoignable — ne pas invalider la session", () => {
    expect(
      evaluateSessionSecurity({
        dbUnreachable: true,
        row: null,
        tokenSessionVersion: 2,
      }),
    ).toEqual({ invalid: false });
  });

  it("invalide un compte supprimé, suspendu ou bump de sessionVersion", () => {
    expect(
      evaluateSessionSecurity({
        dbUnreachable: false,
        row: { ...active, email: "deleted_abc@blocktrust.tech" },
        tokenSessionVersion: 2,
      }).invalid,
    ).toBe(true);
    expect(
      evaluateSessionSecurity({
        dbUnreachable: false,
        row: { ...active, accountStatus: "SUSPENDED" },
        tokenSessionVersion: 2,
      }).invalid,
    ).toBe(true);
    expect(
      evaluateSessionSecurity({
        dbUnreachable: false,
        row: active,
        tokenSessionVersion: 1,
      }).invalid,
    ).toBe(true);
  });

  it("adopte sessionVersion si le token n’en a pas encore", () => {
    expect(
      evaluateSessionSecurity({
        dbUnreachable: false,
        row: active,
        tokenSessionVersion: undefined,
      }),
    ).toEqual({ invalid: false, adoptSessionVersion: 2 });
  });
});
