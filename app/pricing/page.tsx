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
    q: "Qu'est-ce qu'un contact certifié ?",
    a: "Un contact est une personne physique, une entreprise, un domaine web ou tout profil que vous souhaitez certifier avec un badge BLOCKTRUST vérifiable.",
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
    a: 'Oui : Starter dès 9,99€ HT/user/mois (engagement annuel, 1 utilisateur), Team dès 6,99€ HT/user/mois (jusqu’à 10 utilisateurs). Pour les grandes organisations, Enterprise est sur devis — contactez commercial@blocktrust.tech.',
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
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mode, setMode] = useState<'B2C' | 'B2B'>('B2C')

  // Active automatiquement l'onglet Entreprises depuis ?tab=entreprises ou #entreprises.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')?.toLowerCase()
    const hash = window.location.hash.replace('#', '').toLowerCase()
    if (tab === 'entreprises' || tab === 'b2b' || hash === 'entreprises' || hash === 'b2b') {
      setMode('B2B')
    }
  }, [])

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
    <div className="min-h-screen overflow-x-hidden bt-circuit-bg" style={{ background: 'var(--bt-navy)' }}>
      <Navbar />

      <Suspense fallback={null}>
        <PricingContextMessage />
      </Suspense>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
        <h1 className="font-syne text-center text-2xl font-bold text-white sm:text-3xl lg:text-4xl mb-3 sm:mb-4">
          <span className="text-white">Tarifs </span>
          <span className="text-gold">transparents</span>
        </h1>
        <p className="text-white/40 text-sm text-center mt-2">
          Sans engagement · Résiliable à tout moment
        </p>
        <p className="text-white/50 text-sm text-center mt-2">
          Le badge BLOCKTRUST est inclus dans votre abonnement.
          Sans frais cachés — annulable à tout moment.
        </p>
        <p className="mx-auto mb-6 max-w-2xl px-1 text-center font-sans text-sm leading-relaxed text-white/80 sm:mb-10 sm:text-base">
          Choisissez le plan adapté à vos besoins. Annulez à tout moment.
        </p>

        <PricingToggle mode={mode} setMode={setMode} />

        {/* Toggle Mensuel / Annuel */}
        <div className="mb-4 flex max-w-full flex-wrap items-center justify-center gap-2 px-1 sm:gap-3">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className="min-w-0 shrink rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 sm:text-base"
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
            className="min-w-0 shrink rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 sm:text-base"
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
              -20% · Engagement annuel
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
            Son badge BLOCKTRUST fonctionne sur tous ses appareils (PC, mobile, tablette) sans configuration supplémentaire.
          </p>
        )}
      </section>

      {/* Grilles tarifaires — sous chaque bouton : PlanCard affiche la mention résiliation */}
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
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
          <p className="text-xs leading-relaxed text-white/40">
            <span className="font-semibold text-white/60">Contacts</span> = personnes ou entreprises dont vous
            enregistrez les coordonnées officielles (domaine, email, téléphone, wallet).
            <span className="mx-2">·</span>
            <span className="font-semibold text-white/60">Réseau de confiance</span> = contacts qui ont aussi un
            badge BLOCKTRUST — protection maximale activée automatiquement.
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-3xl px-4 text-center text-xs text-white/30 sm:px-6">
          * Vérifications illimitées pendant le lancement (6 mois), puis quotas selon plan. Usage raisonnable — CGU.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="font-syne mb-8 text-center text-xl font-semibold text-white sm:text-2xl">
          Questions fréquentes
        </h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-gold/30"
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
        className="mx-auto mb-16 max-w-7xl rounded-xl border px-4 py-6 text-center sm:px-6 lg:px-8"
        style={{
          background: 'rgba(13,31,60,0.8)',
          borderColor: 'var(--bt-border)',
        }}
      >
        <p className="mb-4" style={{ color: 'var(--bt-text)' }}>
          Vous êtes une entreprise ? Offres B2B dès 6,99€ HT/user/mois (Team, engagement annuel) — Starter dès 9,99€ HT/user/mois.
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
