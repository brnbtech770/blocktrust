// app/pricing/layout.tsx
// Polices Syne (titres) et IBM Plex Mono (données) pour la charte BlockTrust
// ============================================================

import type { Metadata } from 'next'
import { Syne, IBM_Plex_Mono } from 'next/font/google'

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
  title: 'Tarifs · BlockTrust',
  description:
    'Certifiez votre identité numérique dès 4,99€/mois. Badge vérifiable, anti-fraude, blockchain.',
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
