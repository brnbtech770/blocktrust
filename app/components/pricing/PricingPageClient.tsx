'use client'

import Link from 'next/link'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/app/components/landing/Navbar'
import Footer from '@/app/components/landing/Footer'
import PricingToggle from '@/app/components/pricing/PricingToggle'
import PricingGridB2C from '@/app/components/pricing/PricingGridB2C'
import PricingGridB2B from '@/app/components/pricing/PricingGridB2B'
import PricingCompareTable from '@/app/components/pricing/PricingCompareTable'
import { YEARLY_DISCOUNT_LABEL, type PlanB2B, type PlanB2C } from '@/lib/pricing'

function PricingContextMessage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  if (!message?.trim()) return null
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 lg:px-8">
      <div
        role="status"
        className="rounded-xl border border-bt-cyan/45 bg-bt-cyan/10 px-4 py-3 text-sm text-[var(--bt-text)]"
      >
        {message}
      </div>
    </div>
  )
}

type PricingPageClientProps = {
  plans: PlanB2C[]
  plansB2B: PlanB2B[]
  currentPlan: string | null
  isAuthenticated: boolean
}

export default function PricingPageClient({
  plans,
  plansB2B,
  currentPlan,
  isAuthenticated,
}: PricingPageClientProps) {
  const router = useRouter()
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [mode, setMode] = useState<'B2C' | 'B2B'>('B2C')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')?.toLowerCase()
    const hash = window.location.hash.replace('#', '').toLowerCase()
    if (tab === 'entreprises' || tab === 'b2b' || hash === 'entreprises' || hash === 'b2b') {
      setMode('B2B')
    }
  }, [])

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

  return (
    <div className="min-h-screen overflow-x-hidden bt-circuit-bg" style={{ background: 'var(--bt-navy)' }}>
      <Navbar />

      <Suspense fallback={null}>
        <PricingContextMessage />
      </Suspense>

      <section className="mx-auto max-w-7xl px-3 pt-8 pb-4 sm:px-6 sm:pt-12 sm:pb-6 lg:px-8">
        <h1 className="font-syne text-balance mx-auto mb-3 max-w-3xl text-center text-2xl font-bold text-white sm:mb-4 sm:text-3xl lg:text-4xl">
          Des tarifs simples et transparents
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-balance text-center text-base text-white/70 sm:mb-10 sm:text-lg">
          Choisissez la protection qui vous correspond.
        </p>

        <PricingToggle mode={mode} setMode={setMode} />

        <div
          role="tablist"
          aria-label="Fréquence de facturation"
          className="mb-8 flex max-w-full flex-wrap items-center justify-center gap-2 px-1 sm:gap-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={interval === 'monthly'}
            onClick={() => setInterval('monthly')}
            className={`min-w-0 shrink cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 sm:text-base ${
              interval === 'monthly'
                ? 'border-bt-cyan/40 bg-bt-cyan/20 text-bt-cyan'
                : 'border-white/10 bg-white/[0.06] text-white/50'
            }`}
          >
            Mensuel
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={interval === 'yearly'}
            onClick={() => setInterval('yearly')}
            className={`min-w-0 shrink cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 sm:text-base ${
              interval === 'yearly'
                ? 'border-bt-cyan/40 bg-bt-cyan/20 text-bt-cyan'
                : 'border-white/10 bg-white/[0.06] text-white/50'
            }`}
          >
            Annuel
          </button>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-mono text-[10px] font-medium text-emerald-400">
            {YEARLY_DISCOUNT_LABEL}
          </span>
        </div>
      </section>

      <section className="pb-10">
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

        <div className="mx-auto mt-10 flex flex-col items-center gap-4 px-4 text-center">
          <a
            href="#compare"
            className="cursor-pointer text-sm font-medium text-bt-cyan underline-offset-4 hover:underline"
          >
            Comparer les plans en détail →
          </a>
          <p className="text-sm text-white/60">
            Des questions ?{' '}
            <Link
              href="/faq"
              className="cursor-pointer font-medium text-bt-cyan underline-offset-4 hover:underline"
            >
              Consultez notre FAQ →
            </Link>
          </p>
        </div>

        <PricingCompareTable mode={mode} />
      </section>

      <Footer />
    </div>
  )
}
