import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/app/components/landing/Navbar'

export const metadata: Metadata = {
  title: 'FAQ — BLOCKTRUST',
  description: 'Questions fréquentes sur BLOCKTRUST : badge, abonnements, sécurité et vérifications.',
}

export default function FaqPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bt-circuit-bg" style={{ background: 'var(--bt-navy)' }}>
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-syne text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          Questions fréquentes
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
          Notre FAQ détaillée arrive bientôt. En attendant, une question sur les offres,
          le badge ou la sécurité ?
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="mailto:contact@blocktrust.tech"
            className="inline-block rounded-lg px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
            style={{ background: '#00d4ff', color: '#0a1628' }}
          >
            Nous contacter
          </a>
          <Link
            href="/pricing"
            className="inline-block rounded-lg border px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
            style={{ borderColor: 'var(--bt-border)', color: 'var(--bt-cyan)' }}
          >
            Voir les tarifs
          </Link>
        </div>
      </section>
    </div>
  )
}
