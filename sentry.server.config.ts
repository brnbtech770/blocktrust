// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { isSentryRuntimeEnabled } from "@/lib/sentry-runtime";

Sentry.init({
  dsn: "https://506e82cf8b9cfb8ec032eef87f4014be@o4511299450306560.ingest.de.sentry.io/4511299453648976",
  enabled: isSentryRuntimeEnabled(),
  enableLogs: true,
  sendDefaultPii: false,
});
