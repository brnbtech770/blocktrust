import type { Metadata } from "next";

/** Connexion / inscription : non indexées pour éviter le bruit SEO et les extraits hors contexte. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen overflow-x-hidden bt-circuit-bg"
      style={{ background: "var(--bt-navy)" }}
    >
      {children}
    </div>
  );
}
