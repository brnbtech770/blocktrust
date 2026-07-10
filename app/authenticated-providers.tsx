"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** Session NextAuth — auth (signIn/signOut) + routes authentifiées (dashboard, admin, checkout). */
export function AuthenticatedProviders({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
