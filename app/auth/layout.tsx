import type { Metadata } from "next";
import { AuthenticatedProviders } from "@/app/authenticated-providers";

/** Connexion / inscription : non indexées pour éviter le bruit SEO et les extraits hors contexte. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedProviders>
      <div
        className="min-h-screen overflow-x-hidden bt-circuit-bg"
        style={{ background: "var(--bt-navy)" }}
      >
        {children}
      </div>
    </AuthenticatedProviders>
  );
}
