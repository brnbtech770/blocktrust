"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ServiceUnavailableScreen } from "@/app/components/ServiceUnavailableScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <ServiceUnavailableScreen
      title="Service indisponible"
      message="Réessayez dans quelques instants"
      onRetry={reset}
    />
  );
}
