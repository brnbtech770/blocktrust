import { describe, expect, it } from "vitest";
import {
  callbackUrlToPath,
  sanitizeCallbackUrl,
} from "@/app/lib/auth-callback-url";

describe("auth-callback-url", () => {
  it("sanitizeCallbackUrl — défaut /dashboard", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/dashboard");
    expect(sanitizeCallbackUrl("")).toBe("/dashboard");
  });

  it("sanitizeCallbackUrl — rejette open redirect", () => {
    expect(sanitizeCallbackUrl("https://evil.com/phish")).toBe("/dashboard");
  });

  it("callbackUrlToPath — chemin relatif inchangé", () => {
    expect(callbackUrlToPath("/dashboard/settings")).toBe("/dashboard/settings");
  });

  it("callbackUrlToPath — URL absolue same-origin → chemin", () => {
    expect(callbackUrlToPath("https://blocktrust.tech/dashboard")).toBe("/dashboard");
    expect(callbackUrlToPath("https://blocktrust.tech/dashboard?tab=security")).toBe(
      "/dashboard?tab=security",
    );
  });
});
