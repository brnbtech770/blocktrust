import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STEPS,
  shouldAutoOpenOnboarding,
  onboardingFeatureSeenKey,
} from "@/lib/onboarding";

describe("onboarding", () => {
  it("defines 6 guided steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(6);
    expect(ONBOARDING_STEPS.map((s) => s.id)).toEqual([
      "welcome",
      "badge",
      "extension",
      "contacts",
      "bis",
      "finish",
    ]);
  });

  it("auto-opens when onboarding not completed and not dismissed", () => {
    expect(shouldAutoOpenOnboarding(null, null, false)).toBe(true);
    expect(shouldAutoOpenOnboarding(null, "2026-01-01T00:00:00.000Z", false)).toBe(true);
  });

  it("does not auto-open when completed or dismissed", () => {
    expect(shouldAutoOpenOnboarding("2026-01-01T00:00:00.000Z", null, false)).toBe(false);
    expect(shouldAutoOpenOnboarding(null, null, true)).toBe(false);
  });

  it("uses stable localStorage keys per feature", () => {
    expect(onboardingFeatureSeenKey("bis")).toBe("bt_onboarding_seen_bis");
    expect(onboardingFeatureSeenKey("extension")).toBe("bt_onboarding_seen_extension");
  });
});
