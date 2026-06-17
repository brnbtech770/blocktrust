import type { Metadata } from "next";
import ConsentedAnalytics from "@/app/components/analytics/ConsentedAnalytics";
import "./globals.css";
import { Providers } from "./providers";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site-metadata";
import { fontVariables } from "@/lib/fonts";

/** Invalider cache navigateur (Safari/iOS très agressif). Incrémenter après nouveau favicon. */
const ICON_CACHE_QUERY = "v=badge-svg-2";
/** Incrémenter après régénération opengraph-image.png (réseaux cachent agressivement). */
const OG_IMAGE_CACHE_QUERY = "v=seo-canonical-1";

export const metadata: Metadata = {
  metadataBase: new URL("https://blocktrust.tech"),
  title: {
    default: SITE_TITLE,
    template: "%s — BLOCKTRUST™",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "https://blocktrust.tech",
    languages: {
      "fr-FR": "https://blocktrust.tech",
    },
  },
  applicationName: "BLOCKTRUST™",
  keywords: [
    "certification identité numérique",
    "protection usurpation identité",
    "anti fraude identité",
    "blocktrust",
    "solution française cybersécurité",
    "certifier documents en ligne",
    "protection phishing",
    "badge certifié blockchain",
    "faux RIB protection",
    "identité numérique France",
  ],
  authors: [{ name: "BRNB TECH SAS" }],
  creator: "BRNB TECH SAS",
  publisher: "BRNB TECH SAS",
  icons: {
    icon: [
      { url: `/favicon.svg?${ICON_CACHE_QUERY}`, type: "image/svg+xml" },
      { url: `/favicon.png?${ICON_CACHE_QUERY}`, sizes: "32x32", type: "image/png" },
      { url: `/icon-512.png?${ICON_CACHE_QUERY}`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `/apple-touch-icon.png?${ICON_CACHE_QUERY}`, sizes: "180x180", type: "image/png" }],
    shortcut: [`/favicon.png?${ICON_CACHE_QUERY}`],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "BLOCKTRUST™",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: `/opengraph-image.png?${OG_IMAGE_CACHE_QUERY}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [`/opengraph-image.png?${OG_IMAGE_CACHE_QUERY}`],
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
        className={`${fontVariables} font-sans antialiased bg-navy text-gray-100 overflow-x-hidden`}
      >
        <Providers>{children}</Providers>
        <ConsentedAnalytics />
      </body>
    </html>
  );
}
