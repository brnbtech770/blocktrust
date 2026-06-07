// app/pricing/layout.tsx
// Polices Syne (titres) et IBM Plex Mono (données) pour la charte BLOCKTRUST™
// ============================================================

import type { Metadata } from 'next'
import { Syne, IBM_Plex_Mono } from 'next/font/google'
import { formatPriceFr, ESSENTIEL_MONTHLY_EUR } from '@/lib/pricing'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tarifs · BLOCKTRUST™',
  description: `Certifiez votre identité numérique dès ${formatPriceFr(ESSENTIEL_MONTHLY_EUR)}€/mois. Badge vérifiable, anti-fraude, blockchain.`,
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${syne.variable} ${ibmPlexMono.variable} font-sans`}>
      {children}
    </div>
  )
}
