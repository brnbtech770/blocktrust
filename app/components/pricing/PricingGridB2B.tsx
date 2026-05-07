'use client'

import { useRouter } from 'next/navigation'
import PlanCard from './PlanCard'
import type { PlanB2B, BillingInterval } from '@/lib/pricing'

const DESCRIPTIONS: Record<string, string> = {
  STARTER: 'Idéal pour les TPE et indépendants',
  TEAM: 'Pour les équipes en croissance',
  BUSINESS: 'Solution entreprise complète',
  ENTERPRISE: 'Pour les grandes organisations',
}

const CTA_STYLES: Record<string, { background: string; border?: string; color: string }> = {
  STARTER: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
  TEAM: { background: '#00d4ff', color: '#0a1628' },
  BUSINESS: { background: 'var(--bt-gold)', color: '#0a1628' },
  ENTERPRISE: { background: 'transparent', border: '1px solid var(--bt-gold)', color: 'var(--bt-gold)' },
}

const ICONS: Record<string, 'person' | 'shield' | 'group' | 'building' | 'crown'> = {
  STARTER: 'person',
  TEAM: 'group',
  BUSINESS: 'building',
  ENTERPRISE: 'crown',
}

function mapFeatures(plan: PlanB2B): string[] {
  const badgeLabel = 'Badge multi-support (PC · Mobile · Tablette)'
  return plan.features
    .filter((f) => f.included)
    .map((f) => (f.label.toLowerCase().includes('badge') ? badgeLabel : f.label))
}

type Props = {
  plans: PlanB2B[]
  interval: BillingInterval
  currentPlan: string | null
  isAuthenticated: boolean
  loadingPlan: string | null
  onCheckout: (priceId: string) => void
}

function signinCheckoutCallbackUrl(priceId: string) {
  const apiPath = `/api/stripe/create-checkout?priceId=${encodeURIComponent(priceId)}`
  return `/auth/signin?callbackUrl=${encodeURIComponent(apiPath)}`
}

export default function PricingGridB2B({ plans, interval, currentPlan, isAuthenticated, loadingPlan, onCheckout }: Props) {
  const router = useRouter()
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-4 lg:px-8">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id
        const hasPrices = plan.prices != null
        const priceInfo = hasPrices ? plan.prices?.[interval] : null
        const amount = priceInfo?.amount ?? ('Sur devis' as const)
        const priceId = priceInfo?.priceId ?? ''
        const priceUnit = interval === 'monthly' ? '/mois' : '/an'

        return (
          <PlanCard
            key={plan.id}
            mode="B2B"
            name={plan.name}
            description={DESCRIPTIONS[plan.id] ?? ''}
            price={amount}
            priceUnit={hasPrices ? priceUnit : undefined}
            subtitle={plan.users}
            badges={[{ label: 'Multi-support inclus', style: 'multiSupport' }]}
            features={mapFeatures(plan)}
            accordionFeatures={plan.accordionFeatures}
            cta={plan.id === 'ENTERPRISE' ? 'Contacter les ventes' : isCurrent ? 'Plan actuel' : !isAuthenticated ? 'Choisir ce plan' : `Choisir ${plan.name}`}
            ctaStyle={CTA_STYLES[plan.id] ?? { background: '#00d4ff', color: '#0a1628' }}
            isPopular={plan.highlighted}
            icon={ICONS[plan.id] ?? 'person'}
            ctaDisabled={isCurrent}
            ctaLoading={hasPrices && loadingPlan === priceId}
            ctaHref={plan.id === 'ENTERPRISE' ? 'mailto:commercial@blocktrust.tech' : undefined}
            ctaOnClick={
              plan.id === 'ENTERPRISE' || isCurrent
                ? undefined
                : !isAuthenticated
                ? hasPrices && priceId
                  ? () => router.push(signinCheckoutCallbackUrl(priceId))
                  : () => router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`)
                : hasPrices
                ? () => onCheckout(priceId)
                : undefined
            }
          />
        )
      })}
    </div>
  )
}
