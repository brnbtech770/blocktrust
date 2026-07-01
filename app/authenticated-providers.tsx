"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** Session NextAuth — routes authentifiées uniquement (dashboard, admin, checkout). */
export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
