import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isSameOriginMutation } from "@/lib/csrf-origin-guard";

describe("csrf-origin-guard", () => {
  const originalNextAuth = process.env.NEXTAUTH_URL;

  it("accepte Origin blocktrust.tech", () => {
    process.env.NEXTAUTH_URL = "https://blocktrust.tech";
    const req = new NextRequest("https://blocktrust.tech/api/upload", {
      method: "POST",
      headers: { origin: "https://blocktrust.tech" },
    });
    expect(isSameOriginMutation(req)).toBe(true);
    process.env.NEXTAUTH_URL = originalNextAuth;
  });

  it("refuse Origin externe", () => {
    process.env.NEXTAUTH_URL = "https://blocktrust.tech";
    const req = new NextRequest("https://blocktrust.tech/api/upload", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(isSameOriginMutation(req)).toBe(false);
    process.env.NEXTAUTH_URL = originalNextAuth;
  });
});
