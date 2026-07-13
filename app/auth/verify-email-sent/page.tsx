import { Suspense } from "react";
import VerifyEmailSentClient from "./VerifyEmailSentClient";

export default function VerifyEmailSentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/70">
          Chargement…
        </div>
      }
    >
      <VerifyEmailSentClient />
    </Suspense>
  );
}
