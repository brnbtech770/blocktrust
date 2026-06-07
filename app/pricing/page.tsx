'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/app/components/landing/Navbar'
import PricingToggle from '@/app/components/pricing/PricingToggle'
import PricingGridB2C from '@/app/components/pricing/PricingGridB2C'
import PricingGridB2B from '@/app/components/pricing/PricingGridB2B'
import type { PlanB2C, PlanB2B } from '@/lib/pricing'
import {
  formatPriceFr,
  getPlanB2BById,
  STARTER_YEARLY_PER_USER_HT_EUR,
} from '@/lib/pricing'

const teamYearlyPerUserHt =
  getPlanB2BById('TEAM')?.prices?.yearly?.perMonth ?? 6.99

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

  // Redirige vers l'écran de confirmation (acceptation CGU/CGV + renonciation B2C)
  // qui recueille le consentement avant la création de la session Stripe.
  function handleCheckout(
    priceId: string,
    opts?: { quantity?: number; addonQuantity?: number },
  ) {
    setLoadingPlan(priceId)
    const search = new URLSearchParams({ priceId })
    if (opts?.quantity != null) search.set('quantity', String(opts.quantity))
    if (opts?.addonQuantity != null) search.set('addonQuantity', String(opts.addonQuantity))
    router.push(`/checkout/confirm?${search.toString()}`)
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
        <h2 className="mx-auto max-w-2xl text-center text-base font-medium text-white/70 sm:text-lg">
          Le badge BLOCKTRUST est inclus dans tous nos abonnements. Sans frais cachés.
        </h2>
        <div className="mx-auto mb-6 mt-3 max-w-2xl space-y-0.5 px-1 text-center font-sans text-sm leading-relaxed text-white/60 sm:mb-10 sm:text-base">
          <p>Choisissez la formule adaptée à vos besoins.</p>
          <p>Mensuel sans engagement ou annuel à tarif préférentiel.</p>
        </div>

        <PricingToggle mode={mode} setMode={setMode} />

        {/* Toggle Mensuel / Annuel */}
        <div
          role="tablist"
          aria-label="Fréquence de facturation"
          className="mb-4 flex max-w-full flex-wrap items-center justify-center gap-2 px-1 sm:gap-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={interval === 'monthly'}
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
            role="tab"
            aria-selected={interval === 'yearly'}
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
          <span
            className="rounded-full px-3 py-1 text-[10px] font-medium"
            style={{
              background: interval === 'yearly' ? 'rgba(29,184,126,0.15)' : 'rgba(255,255,255,0.06)',
              color: interval === 'yearly' ? '#1DB87E' : 'var(--bt-muted)',
              fontFamily: 'var(--font-mono-bt), "IBM Plex Mono", monospace',
            }}
          >
            {interval === 'yearly' ? '−20% • Paiement annuel' : 'Sans engagement'}
          </span>
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

        {/* Notes légales */}
        <div className="mx-auto mt-6 max-w-3xl space-y-1 px-4 text-center text-xs text-white/30 sm:px-6">
          <p>
            <span className="font-mono">†</span> Vérifications illimitées : usage raisonnable, voir CGV.
          </p>
          <p>
            <span className="font-mono">*</span> Contacts illimités / vérifications Team : conditions détaillées
            dans les{' '}
            <a href="/cgv" className="text-white/45 underline-offset-2 hover:text-bt-cyan">
              CGV
            </a>
            .
          </p>
        </div>
      </section>

      {/* FAQ → page dédiée */}
      <section className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6 lg:px-8">
        <a
          href="/faq"
          className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:brightness-110"
          style={{ color: 'var(--bt-cyan)' }}
        >
          Des questions ? Consulter notre FAQ
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
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
          Vous êtes une entreprise ? Offres B2B dès {formatPriceFr(teamYearlyPerUserHt)}€ HT/user/mois (Team, engagement annuel) — Starter dès {formatPriceFr(STARTER_YEARLY_PER_USER_HT_EUR)}€ HT/user/mois.
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
