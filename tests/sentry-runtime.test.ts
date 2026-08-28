import { describe, expect, it } from "vitest";
import { isSentryRuntimeEnabled, SENTRY_CLIENT_IGNORE_ERRORS } from "@/lib/sentry-runtime";

describe("sentry-runtime", () => {
  it("ignore le bruit de chargement de chunks côté client", () => {
    expect(SENTRY_CLIENT_IGNORE_ERRORS).toContain("Load failed");
    expect(SENTRY_CLIENT_IGNORE_ERRORS).toContain("ChunkLoadError");
    expect(SENTRY_CLIENT_IGNORE_ERRORS).toContain("Échec du chargement");
  });

  it("reste désactivé sous Vitest (NODE_ENV !== production)", () => {
    expect(isSentryRuntimeEnabled()).toBe(false);
  });
});
