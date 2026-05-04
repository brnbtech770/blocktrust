import { Syne, IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";

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
      className={`${syne.variable} ${ibmPlexMono.variable} min-h-screen overflow-x-hidden bt-circuit-bg`}
      style={{ background: 'var(--bt-navy)' }}
    >
      {children}
    </div>
  );
}
