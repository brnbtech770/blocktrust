/**
 * Polices BLOCKTRUST™ — source unique (next/font, self-hosted woff2).
 * display: swap sur toutes les familles ; preload limité aux variantes LCP.
 */
import { Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";

/** Corps — Inter 400 + 700 (medium/semibold → synthèse ou fallback proche). */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/** Titres / wordmarks — Space Grotesk 700 (hero H1, font-syne). */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

/** Mono technique — hors chemin critique landing (preload: false). */
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-bt",
  weight: ["400"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

/** Classes CSS variables à appliquer sur <body> (root layout). */
export const fontVariables = `${inter.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable}`;
