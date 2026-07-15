import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseAuthRedirectUrl } from "@/lib/auth-credentials-client";

const fetchMock = vi.fn();

describe("auth-credentials-client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

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

  it("preCheckCredentialsLogin — retourne lockout sans appeler callback", async () => {
    const { preCheckCredentialsLogin } = await import("@/lib/auth-credentials-client");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ csrfToken: "csrf-test-token" }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: false,
        error: "locked",
        minutesRemaining: 14,
        message: "Compte temporairement verrouillé. Réessayez dans 14 minutes.",
        tone: "error",
      }),
    });

    const result = await preCheckCredentialsLogin({
      email: "user@example.com",
      password: "secret",
    });

    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.errorKind).toBe("locked");
      expect(result.minutesRemaining).toBe(14);
      expect(result.tone).toBe("error");
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login-check",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
