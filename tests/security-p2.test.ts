import { describe, expect, it } from "vitest";
import { getMaxCertificates } from "@/lib/checkQuota";
import { observeBtClientHeader } from "@/lib/api-key-channel-audit";

describe("getMaxCertificates — plan effectif uniquement", () => {
  it("couvre B2C, legacy et B2B sans retomber à 1", () => {
    expect(getMaxCertificates("DISCOVERY")).toBe(1);
    expect(getMaxCertificates("DISCOVERY_EXPIRED")).toBe(0);
    expect(getMaxCertificates("B2C_PREMIUM")).toBe(5);
    expect(getMaxCertificates("B2B_STARTER")).toBe(10);
    expect(getMaxCertificates("B2B_TEAM")).toBe(50);
    expect(getMaxCertificates("B2B_ENTERPRISE")).toBe(999999);
    expect(getMaxCertificates("UNKNOWN")).toBe(1);
  });
});

describe("X-BT-Client — observabilité seulement", () => {
  it("n'accepte que extension et mcp", () => {
    expect(observeBtClientHeader("extension")).toBe("extension");
    expect(observeBtClientHeader(" MCP ")).toBe("mcp");
    expect(observeBtClientHeader("admin")).toBe("unknown");
    expect(observeBtClientHeader(null)).toBe("unknown");
  });
});
