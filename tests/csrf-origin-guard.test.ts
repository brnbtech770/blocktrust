import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  csrfExemptReason,
  isNextAuthInternalPath,
  isSameOriginMutation,
  shouldEnforceCsrfOrigin,
} from "@/lib/csrf-origin-guard";

function headers(init?: Record<string, string>): Headers {
  return new Headers(init);
}

describe("csrf-origin-guard", () => {
  const originalNextAuth = process.env.NEXTAUTH_URL;

  afterEach(() => {
    process.env.NEXTAUTH_URL = originalNextAuth;
  });

  it("accepte Origin blocktrust.tech", () => {
    process.env.NEXTAUTH_URL = "https://blocktrust.tech";
    const req = new NextRequest("https://blocktrust.tech/api/upload", {
      method: "POST",
      headers: { origin: "https://blocktrust.tech" },
    });
    expect(isSameOriginMutation(req)).toBe(true);
  });

  it("accepte Origin www du même domaine", () => {
    process.env.NEXTAUTH_URL = "https://blocktrust.tech";
    const req = new NextRequest("https://blocktrust.tech/api/upload", {
      method: "POST",
      headers: { origin: "https://www.blocktrust.tech" },
    });
    expect(isSameOriginMutation(req)).toBe(true);
  });

  it("refuse Origin externe", () => {
    process.env.NEXTAUTH_URL = "https://blocktrust.tech";
    const req = new NextRequest("https://blocktrust.tech/api/upload", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(isSameOriginMutation(req)).toBe(false);
  });
});

describe("csrfExemptReason — inventaire mutations", () => {
  it("n’applique pas Origin sur GET", () => {
    expect(csrfExemptReason("/api/certificates", "GET", headers())).toBe("not-mutating");
    expect(shouldEnforceCsrfOrigin("/api/certificates", "GET", headers())).toBe(false);
  });

  it("exempte NextAuth interne, crons, webhooks Stripe, MCP, verify public", () => {
    expect(isNextAuthInternalPath("/api/auth/callback/google")).toBe(true);
    expect(isNextAuthInternalPath("/api/auth/session")).toBe(true);
    expect(csrfExemptReason("/api/auth/callback/credentials", "POST", headers())).toBe(
      "nextauth",
    );
    expect(csrfExemptReason("/api/cron/qstash-surveillance", "POST", headers())).toBe("cron");
    expect(csrfExemptReason("/api/cron/anomaly-detection", "POST", headers())).toBe("cron");
    expect(csrfExemptReason("/api/stripe/webhook", "POST", headers())).toBe("stripe-webhook");
    expect(csrfExemptReason("/api/stripe/identity-webhook", "POST", headers())).toBe(
      "stripe-webhook",
    );
    expect(csrfExemptReason("/mcp/sse", "POST", headers())).toBe("mcp");
    expect(csrfExemptReason("/api/v2/verify", "POST", headers())).toBe("public");
    expect(csrfExemptReason("/api/public/certificate/abc", "POST", headers())).toBe("public");
  });

  it("exempte l’extension BIS uniquement avec clé API", () => {
    expect(
      csrfExemptReason("/api/bis/sign", "POST", headers({ authorization: "Bearer bt_ext_test" })),
    ).toBe("extension-api-key");
    expect(
      csrfExemptReason("/api/extension/add-contact", "POST", headers({ "x-api-key": "bt_ext_test" })),
    ).toBe("extension-api-key");
    expect(csrfExemptReason("/api/bis/sign", "POST", headers())).toBeNull();
  });

  it("exige Origin sur les mutations cookie-auth critiques", () => {
    const empty = headers();
    const guarded = [
      "/api/certificates",
      "/api/certificates/clxxxxxxxxxxxxxxxxxxxxxxxx/revoke",
      "/api/entities",
      "/api/contacts/clxxxxxxxxxxxxxxxxxxxxxxxx",
      "/api/trust-circle/add",
      "/api/trust-circle/manual",
      "/api/user/account",
      "/api/user/password",
      "/api/user/certified-contacts",
      "/api/auth/register",
      "/api/auth/login-check",
      "/api/stripe/portal",
      "/api/stripe/create-checkout",
      "/api/whitelabel/test-webhook",
      "/api/admin/users",
    ];
    for (const pathname of guarded) {
      expect(csrfExemptReason(pathname, "POST", empty), pathname).toBeNull();
      expect(shouldEnforceCsrfOrigin(pathname, "POST", empty), pathname).toBe(true);
    }
    expect(shouldEnforceCsrfOrigin("/api/entities/abc", "PATCH", empty)).toBe(true);
    expect(shouldEnforceCsrfOrigin("/api/trust-circle/abc", "DELETE", empty)).toBe(true);
  });
});
