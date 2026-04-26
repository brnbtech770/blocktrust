import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-bt",
  weight: ["400", "500", "600"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://blocktrust.tech";
const SITE_TITLE = "BlockTrust — Certification d'identité numérique";
const SITE_DESCRIPTION =
  "Protégez chaque interaction de votre écosystème digital. BlockTrust certifie votre identité et sécurise vos échanges en ligne — pour les particuliers comme pour les entreprises.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — BlockTrust",
  },
  description: SITE_DESCRIPTION,
  applicationName: "BlockTrust",
  keywords: [
    "BlockTrust",
    "identité numérique",
    "blockchain",
    "Polygon",
    "certificat",
    "KYC",
    "anti-phishing",
    "badge vérifié",
  ],
  authors: [{ name: "BRNB TECH SASU" }],
  creator: "BRNB TECH SASU",
  publisher: "BRNB TECH SASU",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.png"],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "BlockTrust",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BlockTrust — Certification d'identité numérique",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable} font-sans antialiased bg-navy text-gray-100 overflow-x-hidden`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
