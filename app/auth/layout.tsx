import { Syne, IBM_Plex_Mono } from "next/font/google";
import { auth } from "@/app/lib/auth-server";
import { cookies, headers } from "next/headers";
import { writeAgentDebugLog } from "@/app/lib/agent-debug-467f2c-log";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const cookieStore = await cookies();
  const sessionCookieHints = cookieStore.getAll().filter(
    (c) =>
      c.name === "authjs.session-token" ||
      c.name === "__Secure-authjs.session-token" ||
      c.name.startsWith("authjs.session-token.") ||
      c.name.startsWith("__Secure-authjs.session-token.")
  );
  const hasSessionCookie = sessionCookieHints.length > 0;
  const hasSession = !!session?.user?.email;
  const hdrs = await headers();
  const cookieHeaderLen = (hdrs.get("cookie") ?? "").length;
  const refererLen = (hdrs.get("referer") ?? "").length;

  // #region agent log
  await writeAgentDebugLog({
    hypothesisId: "H4",
    location: "app/auth/layout.tsx",
    message: "Auth segment render (signin/register/etc.)",
    runId: "verify-auth-layout",
    data: {
      hasSession,
      hasSessionCookie,
      sessionCookieCount: sessionCookieHints.length,
      mismatchCookieWithoutSession: hasSessionCookie && !hasSession,
      cookieHeaderLen,
      refererLen,
    },
  });
  // #endregion

  return (
    <div
      className={`${syne.variable} ${ibmPlexMono.variable} min-h-screen bt-circuit-bg`}
      style={{ background: 'var(--bt-navy)' }}
    >
      {children}
    </div>
  );
}
