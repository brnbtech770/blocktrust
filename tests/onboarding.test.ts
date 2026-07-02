import { describe, expect, it } from "vitest";
import {
  ONBOARDING_ENCYCLOPEDIA,
  ONBOARDING_STEPS,
  ONBOARDING_TOUR_STEP_IDS,
  shouldAutoOpenOnboarding,
  onboardingFeatureSeenKey,
  getOnboardingStep,
} from "@/lib/onboarding";

describe("onboarding", () => {
  it("defines 11 guided tour steps", () => {
    expect(ONBOARDING_TOUR_STEP_IDS).toHaveLength(11);
    expect(ONBOARDING_STEPS).toHaveLength(11);
    expect(ONBOARDING_STEPS[0]?.id).toBe("welcome");
    expect(ONBOARDING_STEPS[10]?.id).toBe("finish");
  });

  it("encyclopedia covers all major features including MCP", () => {
    expect(ONBOARDING_ENCYCLOPEDIA).toHaveLength(11);
    expect(ONBOARDING_ENCYCLOPEDIA.map((e) => e.stepId)).toContain("mcp");
    expect(ONBOARDING_ENCYCLOPEDIA.map((e) => e.stepId)).toContain("vault");
    expect(ONBOARDING_ENCYCLOPEDIA.map((e) => e.stepId)).toContain("domains");
  });

  it("each tour step has body and title", () => {
    for (const id of ONBOARDING_TOUR_STEP_IDS) {
      const step = getOnboardingStep(id);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
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
    expect(onboardingFeatureSeenKey("vault")).toBe("bt_onboarding_seen_vault");
    expect(onboardingFeatureSeenKey("trustscore")).toBe("bt_onboarding_seen_trustscore");
  });
});
