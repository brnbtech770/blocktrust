import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlockTrust - Certification Blockchain Anti-Fraude",
  description:
    "Protégez votre identité numérique avec la blockchain. Certification infalsifiable, vérification instantanée, protection anti-fraude 24/7.",
  keywords: [
    "blockchain",
    "certification",
    "anti-fraude",
    "identité numérique",
    "NFT",
    "Polygon",
  ],
  openGraph: {
    title: "BlockTrust - Certification Blockchain Anti-Fraude",
    description: "Protégez votre identité numérique avec la blockchain",
    type: "website",
    locale: "fr_FR",
    url: "https://blocktrust.tech",
    siteName: "BlockTrust",
  },
  twitter: {
    card: "summary_large_image",
    title: "BlockTrust - Certification Blockchain",
    description: "Protégez votre identité numérique avec la blockchain",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
