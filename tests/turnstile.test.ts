import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/security-audit", () => ({
  writeSecurityAuditLogFireAndForget: vi.fn(),
}));

import { verifyTurnstileForRegister } from "@/lib/turnstile";

describe("verifyTurnstileForRegister", () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY;
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalSecret;
    }
  });

  it("accepte le bypass même si un token invalide est présent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      }),
    );

    const result = await verifyTurnstileForRegister({
      token: "invalid-token",
      bypass: true,
      ip: "127.0.0.1",
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.skipped) {
      expect(result.reason).toBe("client_bypass");
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignore la vérification si le secret est absent", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;

    const result = await verifyTurnstileForRegister({
      token: undefined,
      bypass: false,
    });

    expect(result).toEqual({ ok: true, skipped: true, reason: "no_secret" });
  });

  it("rejette sans token ni bypass", async () => {
    const result = await verifyTurnstileForRegister({
      token: undefined,
      bypass: false,
    });

    expect(result).toEqual({ ok: false, reason: "missing_token" });
  });
});
