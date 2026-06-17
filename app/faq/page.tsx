import type { Metadata } from 'next'
import Navbar from '@/app/components/landing/Navbar'
import Footer from '@/app/components/landing/Footer'
import FaqContent from './FaqContent'

export const metadata: Metadata = {
  title: 'FAQ — BLOCKTRUST',
  description:
    'Questions fréquentes sur BLOCKTRUST™ : certification, badge, TrustScore, signatures BIS, extension Chrome et protection des données.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ — BLOCKTRUST™',
    description:
      'Réponses sur la certification d’identité, la vérification de badge, le TrustScore et l’extension Chrome TrustScan.',
    url: '/faq',
  },
}

export default function FaqPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bt-circuit-bg" style={{ background: 'var(--bt-navy)' }}>
      <Navbar />
      <FaqContent />
      <Footer />
    </div>
  )
}
