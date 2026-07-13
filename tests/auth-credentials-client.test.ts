import { describe, expect, it } from "vitest";
import { parseAuthRedirectUrl } from "@/lib/auth-credentials-client";

describe("auth-credentials-client", () => {
  it("parseAuthRedirectUrl — URL absolue avec erreur", () => {
    const parsed = parseAuthRedirectUrl(
      "https://blocktrust.tech/auth/signin?error=CredentialsSignin&code=credentials",
      "https://blocktrust.tech",
    );
    expect(parsed.error).toBe("CredentialsSignin");
    expect(parsed.code).toBe("credentials");
  });

  it("parseAuthRedirectUrl — chemin relatif sans throw", () => {
    const parsed = parseAuthRedirectUrl(
      "/auth/signin?error=AccountLocked&code=account_locked",
      "https://blocktrust.tech",
    );
    expect(parsed.error).toBe("AccountLocked");
    expect(parsed.code).toBe("account_locked");
  });

  it("parseAuthRedirectUrl — codes lockout dans URL", () => {
    const parsed = parseAuthRedirectUrl(
      "https://blocktrust.tech/auth/signin?error=CredentialsSignin&code=FAILED:2",
      "https://blocktrust.tech",
    );
    expect(parsed.code).toBe("FAILED:2");
  });
});
