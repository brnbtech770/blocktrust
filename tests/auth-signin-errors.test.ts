import { describe, it, expect } from "vitest";
import {
  parseCredentialsSignInError,
  credentialsErrorMessage,
  oauthOrSignInErrorMessage,
  failedAttemptsMessage,
  lockedMinutesMessage,
  parseLockoutErrorCode,
} from "@/lib/auth-signin-errors";

describe("auth-signin-errors", () => {
  it("parseLockoutErrorCode — FAILED et LOCKED", () => {
    expect(parseLockoutErrorCode("FAILED:3")).toEqual({ type: "failed", remaining: 3 });
    expect(parseLockoutErrorCode("LOCKED:12")).toEqual({ type: "locked", minutes: 12 });
  });

  it("failedAttemptsMessage — dernière tentative", () => {
    expect(failedAttemptsMessage(1)).toContain("Dernière tentative");
    expect(failedAttemptsMessage(3)).toContain("3 tentatives restantes");
  });

  it("parseCredentialsSignInError — FAILED depuis code", () => {
    const parsed = parseCredentialsSignInError({
      ok: false,
      code: "FAILED:2",
    });
    expect(parsed.code).toBe("failed_attempts");
    expect(parsed.tone).toBe("warning");
    expect(parsed.message).toContain("2 tentatives");
  });

  it("parseCredentialsSignInError — LOCKED depuis code", () => {
    const parsed = parseCredentialsSignInError({
      ok: false,
      code: "LOCKED:9",
    });
    expect(parsed.code).toBe("account_locked");
    expect(parsed.tone).toBe("error");
    expect(parsed.message).toBe(lockedMinutesMessage(9));
  });

  it("parseCredentialsSignInError — account_locked depuis code", () => {
    const parsed = parseCredentialsSignInError({
      ok: false,
      error: "CredentialsSignin",
      code: "account_locked",
    });
    expect(parsed.code).toBe("account_locked");
    expect(parsed.message).toContain("15 minutes");
  });

  it("parseCredentialsSignInError — account_locked depuis URL", () => {
    const parsed = parseCredentialsSignInError({
      ok: false,
      error: "CredentialsSignin",
      url: "https://blocktrust.tech/auth/signin?error=account_locked",
    });
    expect(parsed.code).toBe("account_locked");
  });

  it("parseCredentialsSignInError — no_password", () => {
    const parsed = parseCredentialsSignInError({
      ok: false,
      error: "no_password",
    });
    expect(parsed.code).toBe("no_password");
    expect(parsed.message).toContain("Google");
  });

  it("parseCredentialsSignInError — identifiants incorrects par défaut", () => {
    const parsed = parseCredentialsSignInError({
      ok: false,
      error: "CredentialsSignin",
    });
    expect(parsed.code).toBe("credentials");
    expect(parsed.message).toBe(credentialsErrorMessage("credentials"));
  });

  it("credentialsErrorMessage — lockout étendu 1 h", () => {
    expect(credentialsErrorMessage("account_locked", true)).toContain("1 heure");
  });

  it("oauthOrSignInErrorMessage — codes OAuth connus", () => {
    expect(oauthOrSignInErrorMessage("OAuthAccountNotLinked")).toContain("email");
    expect(oauthOrSignInErrorMessage("account_locked")).toContain("15 minutes");
  });
});
