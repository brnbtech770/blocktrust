"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const CookieBanner = dynamic(() => import("@/app/components/ui/CookieBanner"), {
  ssr: false,
});

/** Providers publics — sans SessionProvider (session réservée au groupe (authenticated)). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CookieBanner />
    </>
  );
}
