// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import {
  isSentryRuntimeEnabled,
  SENTRY_CLIENT_IGNORE_ERRORS,
} from "@/lib/sentry-runtime";

Sentry.init({
  dsn: "https://506e82cf8b9cfb8ec032eef87f4014be@o4511299450306560.ingest.de.sentry.io/4511299453648976",
  enabled: isSentryRuntimeEnabled(),
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  ignoreErrors: SENTRY_CLIENT_IGNORE_ERRORS,
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
