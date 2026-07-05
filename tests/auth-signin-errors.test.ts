import { describe, it, expect } from "vitest";
import {
  parseCredentialsSignInError,
  credentialsErrorMessage,
  oauthOrSignInErrorMessage,
} from "@/lib/auth-signin-errors";

describe("auth-signin-errors", () => {
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
    expect(parsed.message).toContain("lien magique");
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
