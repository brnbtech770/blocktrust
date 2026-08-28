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
