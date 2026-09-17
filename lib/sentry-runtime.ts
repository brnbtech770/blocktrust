// lib/sentry-runtime.ts
// Activation Sentry : production runtime uniquement (pas le `next build`).
// ============================================================

export function isSentryRuntimeEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  return true;
}

/** Bruit navigateur après un déploiement (ancien HTML + nouveaux chunks). */
export const SENTRY_CLIENT_IGNORE_ERRORS: Array<string | RegExp> = [
  "Load failed",
  "Failed to fetch",
  "NetworkError when attempting to fetch resource",
  "ChunkLoadError",
  /Loading chunk [\d]+ failed/,
  /Loading CSS chunk [\d]+ failed/,
  "Échec du chargement",
];

const SENTRY_PII_KEY = /e-?mail|recipientEmail/i;

function scrubSentryRecord(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  for (const key of Object.keys(data)) {
    if (SENTRY_PII_KEY.test(key)) {
      data[key] = "[redacted]";
    }
  }
}

/** sendDefaultPii: false + filet si un breadcrumb/extra contient un email. */
export function scrubSentryEvent<
  T extends {
    extra?: Record<string, unknown>;
    breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
  },
>(event: T): T {
  if (event.extra) scrubSentryRecord(event.extra);
  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (crumb.data) scrubSentryRecord(crumb.data);
    }
  }
  return event;
}
