import { describe, expect, it } from "vitest";
import {
  isSessionForRegisteredEmail,
  REGISTER_SIGNIN_FALLBACK_MESSAGE,
} from "@/lib/register-signin";

describe("register-signin", () => {
  it("isSessionForRegisteredEmail — match insensible à la casse", () => {
    expect(
      isSessionForRegisteredEmail(
        { user: { email: "User@Example.com" } },
        "user@example.com",
      ),
    ).toBe(true);
  });

  it("isSessionForRegisteredEmail — rejette session autre compte", () => {
    expect(
      isSessionForRegisteredEmail(
        { user: { email: "other@example.com" } },
        "user@example.com",
      ),
    ).toBe(false);
  });

  it("REGISTER_SIGNIN_FALLBACK_MESSAGE", () => {
    expect(REGISTER_SIGNIN_FALLBACK_MESSAGE).toBe("Compte créé. Connectez-vous.");
  });
});
