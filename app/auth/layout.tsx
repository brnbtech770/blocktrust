import { Syne, IBM_Plex_Mono } from "next/font/google";

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
  return (
    <div
      className={`${syne.variable} ${ibmPlexMono.variable} min-h-screen overflow-x-hidden bt-circuit-bg`}
      style={{ background: 'var(--bt-navy)' }}
    >
      {children}
    </div>
  );
}
