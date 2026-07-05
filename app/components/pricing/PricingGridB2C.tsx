'use client'

import { useRouter } from 'next/navigation'
import PlanCard from './PlanCard'
import {
  formatPriceFr,
  PRICING_CARD_BENEFITS_B2C,
  getAlternateBillingNote,
  getPlanPerMonthAmount,
  getPlanPriceId,
  type PlanB2C,
  type BillingInterval,
} from '@/lib/pricing'
import type { PlanCardFeature } from './PlanCard'

const CTA_STYLES: Record<string, { background: string; border?: string; color: string }> = {
  DISCOVERY: { background: 'var(--bt-gold)', color: '#0a1628' },
  ESSENTIEL: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
  PREMIUM: { background: '#00d4ff', color: '#0a1628' },
  FAMILLE: { background: 'transparent', border: '1px solid #00d4ff', color: '#00d4ff' },
}

type CheckoutOpts = { quantity?: number; addonQuantity?: number }

type Props = {
  plans: PlanB2C[]
  interval: BillingInterval
  currentPlan: string | null
  isAuthenticated: boolean
  loadingPlan: string | null
  onCheckout: (priceId: string, opts?: CheckoutOpts) => void
}

function signinCheckoutCallbackUrl(priceId: string) {
  const confirmPath = `/checkout/confirm?priceId=${encodeURIComponent(priceId)}`
  return `/auth/signin?callbackUrl=${encodeURIComponent(confirmPath)}`
}

export default function PricingGridB2C({
  plans,
  interval,
  currentPlan,
  isAuthenticated,
  loadingPlan,
  onCheckout,
}: Props) {
  const router = useRouter()

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-4 lg:px-8">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id
        const benefits: PlanCardFeature[] = [...(PRICING_CARD_BENEFITS_B2C[plan.id] ?? [])]
        if (plan.id === 'ESSENTIEL') {
          benefits.push({ label: 'Trust Circle disponible en Premium', muted: true })
        }
        const isPopular = plan.id === 'PREMIUM'

        if (plan.isFree || !plan.prices) {
          return (
            <PlanCard
              key={plan.id}
              name={plan.name}
              price="Gratuit"
              features={benefits}
              cta={isCurrent ? 'Plan actuel' : 'Commencer gratuitement'}
              ctaStyle={CTA_STYLES[plan.id] ?? { background: 'var(--bt-gold)', color: '#0a1628' }}
              isPopular={isPopular}
              ctaDisabled={isCurrent}
              ctaOnClick={
                isCurrent
                  ? undefined
                  : isAuthenticated
                    ? () => router.push('/dashboard')
                    : () => router.push('/auth/register')
              }
            />
          )
        }

        const priceId = getPlanPriceId(plan, interval) ?? ''
        const perMonth = getPlanPerMonthAmount(plan, interval) ?? 0
        const isYearly = interval === 'yearly'
        const priceInfo = plan.prices[interval]
        const billedNote = isYearly
          ? `Facturé ${formatPriceFr(priceInfo.amount)}€/an (TTC)`
          : undefined
        const altBillingNote = getAlternateBillingNote(plan, interval, 'TTC')

        return (
          <PlanCard
            key={plan.id}
            name={plan.name}
            price={perMonth}
            taxLabel="(TTC)"
            priceUnit="/mois"
            billedNote={billedNote}
            altBillingNote={altBillingNote}
            features={benefits}
            cta={isCurrent ? 'Plan actuel' : 'Choisir ce plan'}
            ctaStyle={CTA_STYLES[plan.id] ?? { background: '#00d4ff', color: '#0a1628' }}
            isPopular={isPopular}
            ctaDisabled={isCurrent}
            ctaLoading={loadingPlan === priceId}
            ctaOnClick={
              isCurrent
                ? undefined
                : !isAuthenticated
                  ? () => router.push(signinCheckoutCallbackUrl(priceId))
                  : () => onCheckout(priceId)
            }
          />
        )
      })}
    </div>
  )
}
