// Tunnel de paiement — écran de confirmation (acceptation CGU/CGV + renonciation B2C)
// avant création de la session Stripe. Route protégée (proxy.ts + session).
// ============================================================

import { Suspense } from 'react'
import Navbar from '@/app/components/landing/Navbar'
import Footer from '@/app/components/landing/Footer'
import CheckoutConfirmClient from './CheckoutConfirmClient'

export const dynamic = 'force-dynamic'

export default function CheckoutConfirmPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bt-navy)' }}>
      <Navbar />
      <Suspense fallback={null}>
        <CheckoutConfirmClient />
      </Suspense>
      <Footer />
    </div>
  )
}
