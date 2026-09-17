import { describe, expect, it } from "vitest";
import {
  isSentryRuntimeEnabled,
  SENTRY_CLIENT_IGNORE_ERRORS,
  scrubSentryEvent,
} from "@/lib/sentry-runtime";

describe("sentry-runtime", () => {
  it("ignore le bruit de chargement de chunks côté client", () => {
    expect(SENTRY_CLIENT_IGNORE_ERRORS).toContain("Load failed");
    expect(SENTRY_CLIENT_IGNORE_ERRORS).toContain("ChunkLoadError");
    expect(SENTRY_CLIENT_IGNORE_ERRORS).toContain("Échec du chargement");
  });

  it("reste désactivé sous Vitest (NODE_ENV !== production)", () => {
    expect(isSentryRuntimeEnabled()).toBe(false);
  });

  it("redacte les emails dans extra et breadcrumbs Sentry", () => {
    const event = scrubSentryEvent({
      extra: { recipientEmail: "secret@example.com", bisId: "sig" },
      breadcrumbs: [{ data: { email: "other@example.com", ok: true } }],
    });
    expect(event.extra?.recipientEmail).toBe("[redacted]");
    expect(event.extra?.bisId).toBe("sig");
    expect(event.breadcrumbs?.[0]?.data?.email).toBe("[redacted]");
    expect(event.breadcrumbs?.[0]?.data?.ok).toBe(true);
  });
});

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
