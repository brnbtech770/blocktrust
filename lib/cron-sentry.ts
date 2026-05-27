// lib/cron-sentry.ts
// Alertes Sentry en production si un cron échoue
// ============================================================

import * as Sentry from '@sentry/nextjs'

export function captureCronFailure(
  cronName: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'

  console.error(`[cron/${cronName}]`, error)

  if (process.env.NODE_ENV !== 'production') {
    return
  }

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) {
    return
  }

  Sentry.captureMessage(`[cron] ${cronName} failed: ${message}`, {
    level: 'error',
    extra: { cronName, ...extra },
  })

  if (error instanceof Error) {
    Sentry.captureException(error)
  }
}
