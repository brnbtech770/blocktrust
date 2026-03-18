'use client'

import { signIn } from 'next-auth/react'
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

export default function PricingGridB2B({ plans, interval, currentPlan, isAuthenticated, loadingPlan, onCheckout }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1200px] mx-auto px-6">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id
        const hasPrices = plan.prices != null
        const priceInfo = hasPrices ? plan.prices![interval] : null
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
                ? () => signIn('google', { callbackUrl: '/pricing' })
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
