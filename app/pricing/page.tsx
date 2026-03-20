'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Navbar from '@/app/components/landing/Navbar'
import PricingToggle from '@/app/components/pricing/PricingToggle'
import PricingGridB2C from '@/app/components/pricing/PricingGridB2C'
import PricingGridB2B from '@/app/components/pricing/PricingGridB2B'
import type { PlanB2C, PlanB2B } from '@/lib/pricing'

const FAQ = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: "Oui, sans engagement et sans frais. L'annulation prend effet à la fin de la période en cours. Gérez votre abonnement directement depuis votre espace client.",
  },
  {
    q: "Qu'est-ce qu'une entité certifiée ?",
    a: "Une entité est une personne physique, une entreprise, un domaine web ou tout profil que vous souhaitez certifier avec un badge BlockTrust vérifiable.",
  },
  {
    q: 'Comment fonctionne le badge de vérification ?',
    a: "Chaque badge contient une signature cryptographique ES256 et un hash SHA-256 du contenu. Toute tentative de copie dans un contexte frauduleux est détectée et affiche une alerte fraude.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: "Oui. Vos données sont chiffrées, hébergées en Europe (Vercel EU), et nous sommes conformes au RGPD. Aucune donnée n'est vendue à des tiers.",
  },
  {
    q: 'Proposez-vous des offres pour les entreprises ?',
    a: 'Oui, notre offre B2B démarre à 29€/mois. Contactez-nous à commercial@blocktrust.tech pour un devis personnalisé.',
  },
]

function PricingContextMessage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  if (!message?.trim()) return null
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div
        role="status"
        className="rounded-xl border px-4 py-3 text-sm"
        style={{
          borderColor: 'rgba(0,212,255,0.45)',
          background: 'rgba(0,212,255,0.1)',
          color: 'var(--bt-text)',
        }}
      >
        {message}
      </div>
    </div>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [plans, setPlans] = useState<PlanB2C[]>([])
  const [plansB2B, setPlansB2B] = useState<PlanB2B[]>([])
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mode, setMode] = useState<'B2C' | 'B2B'>('B2C')

  useEffect(() => {
    fetch('/api/pricing')
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans || [])
        setPlansB2B(data.plansB2B || [])
      })
      .catch(() => { setPlans([]); setPlansB2B([]) })
  }, [])

  async function handleCheckout(priceId: string) {
    setLoadingPlan(priceId)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
      else throw new Error(data.error || 'Erreur')
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setLoadingPlan(null)
    }
  }

  const currentPlan = (session?.user as { plan?: string } | null)?.plan ?? null
  const isAuthenticated = status === 'authenticated'

  return (
    <div className="min-h-screen bt-circuit-bg" style={{ background: 'var(--bt-navy)' }}>
      <Navbar />

      <Suspense fallback={null}>
        <PricingContextMessage />
      </Suspense>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        <h1
          className="text-4xl md:text-5xl font-extrabold text-center mb-4"
          style={{ fontFamily: 'var(--font-syne), sans-serif' }}
        >
          <span className="text-white">Tarifs </span>
          <span style={{ color: 'var(--bt-gold)' }}>transparents</span>
        </h1>
        <p
          className="text-center text-base max-w-2xl mx-auto mb-10"
          style={{ color: 'var(--bt-muted)' }}
        >
          Choisissez le plan adapté à vos besoins. Annulez à tout moment.
        </p>

        <PricingToggle mode={mode} setMode={setMode} />

        {/* Toggle Mensuel / Annuel */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: interval === 'monthly' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.06)',
              color: interval === 'monthly' ? '#00d4ff' : 'var(--bt-muted)',
              border: `1px solid ${interval === 'monthly' ? 'rgba(0,212,255,0.4)' : 'var(--bt-border)'}`,
            }}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: interval === 'yearly' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.06)',
              color: interval === 'yearly' ? '#00d4ff' : 'var(--bt-muted)',
              border: `1px solid ${interval === 'yearly' ? 'rgba(0,212,255,0.4)' : 'var(--bt-border)'}`,
            }}
          >
            Annuel
          </button>
          {interval === 'yearly' && (
            <span
              className="rounded-full px-3 py-1 text-[10px] font-medium"
              style={{
                background: 'rgba(29,184,126,0.15)',
                color: '#1DB87E',
                fontFamily: 'var(--font-mono-bt), "IBM Plex Mono", monospace',
              }}
            >
              -20% · Offre de lancement
            </span>
          )}
        </div>

        {/* Pill info */}
        <div
          className="w-fit mx-auto mb-3 text-[13px] rounded-full px-4 py-1.5 border"
          style={{ borderColor: 'var(--bt-border)', color: 'var(--bt-muted)' }}
        >
          {mode === 'B2B'
            ? '1 badge = 1 identité · multi-support'
            : '1 profil = 1 badge multi-support + Trust Circle inclus'}
        </div>

        {/* Phrase explicative B2B */}
        {mode === 'B2B' && (
          <p className="text-center text-sm max-w-xl mx-auto mb-8" style={{ color: 'var(--bt-muted)' }}>
            <span className="text-white font-semibold">1 poste = 1 utilisateur.</span>{' '}
            Son badge BlockTrust fonctionne sur tous ses appareils (PC, mobile, tablette) sans configuration supplémentaire.
          </p>
        )}
      </section>

      {/* Grid */}
      <section className="pb-16">
        {mode === 'B2C' ? (
          <PricingGridB2C
            plans={plans}
            interval={interval}
            currentPlan={currentPlan}
            isAuthenticated={isAuthenticated}
            loadingPlan={loadingPlan}
            onCheckout={handleCheckout}
          />
        ) : (
          <PricingGridB2B
            plans={plansB2B}
            interval={interval}
            currentPlan={currentPlan}
            isAuthenticated={isAuthenticated}
            loadingPlan={loadingPlan}
            onCheckout={handleCheckout}
          />
        )}
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2
          className="text-2xl font-bold text-center mb-8"
          style={{ color: 'var(--bt-text)', fontFamily: 'var(--font-syne), sans-serif' }}
        >
          Questions fréquentes
        </h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border"
              style={{
                background: 'rgba(13,31,60,0.8)',
                borderColor: 'var(--bt-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-6 py-4 flex justify-between items-center"
                style={{ color: 'var(--bt-text)' }}
              >
                <span className="font-medium">{item.q}</span>
                <span style={{ color: 'var(--bt-cyan)' }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4 pt-0" style={{ color: 'var(--bt-muted)' }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* B2B CTA */}
      <section
        className="max-w-7xl mx-auto mx-4 sm:mx-6 lg:mx-8 mb-16 rounded-xl py-6 px-6 text-center border"
        style={{
          background: 'rgba(13,31,60,0.8)',
          borderColor: 'var(--bt-border)',
        }}
      >
        <p className="mb-4" style={{ color: 'var(--bt-text)' }}>
          Vous êtes une entreprise ? Découvrez nos offres B2B à partir de 29€/mois
        </p>
        <a
          href="mailto:commercial@blocktrust.tech"
          className="inline-block py-2 px-5 rounded-lg font-medium hover:brightness-110 transition-all"
          style={{ background: '#00d4ff', color: '#0a1628' }}
        >
          Nous contacter
        </a>
      </section>
    </div>
  )
}
