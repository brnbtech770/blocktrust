"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  console.log('[DEBUG] Providers rendering');
  return <SessionProvider>{children}</SessionProvider>;
}
