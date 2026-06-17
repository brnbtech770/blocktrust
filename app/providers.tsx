"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

const CookieBanner = dynamic(() => import("@/app/components/ui/CookieBanner"), {
  ssr: false,
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CookieBanner />
    </SessionProvider>
  );
}
