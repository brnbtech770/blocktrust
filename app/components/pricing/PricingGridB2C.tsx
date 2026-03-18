'use client'

import { signIn } from 'next-auth/react'
import PlanCard from './PlanCard'
import type { PlanB2C, BillingInterval } from '@/lib/pricing'

const DESCRIPTIONS: Record<string, string> = {
  ESSENTIEL: 'Protection personnelle de base',
  PREMIUM: 'Protection personnelle avancée',
  FAMILLE: 'Protégez toute votre famille',
  FAMILLE_PLUS: 'Famille élargie & protection max',
}

const ICONS: Record<string, 'person' | 'shield' | 'group' | 'crown'> = {
  ESSENTIEL: 'person',
  PREMIUM: 'shield',
  FAMILLE: 'group',
  FAMILLE_PLUS: 'crown',
}

const CTA_LABELS: Record<string, string> = {
  ESSENTIEL: 'Choisir Essentiel',
  PREMIUM: 'Choisir Premium',
  FAMILLE: 'Choisir Famille',
  FAMILLE_PLUS: 'Choisir Famille+',
}

const CTA_STYLES: Record<string, { background: string; border?: string; color: string }> = {
  ESSENTIEL: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
  PREMIUM: { background: 'transparent', border: '1px solid #00d4ff', color: '#00d4ff' },
  FAMILLE: { background: '#00d4ff', color: '#0a1628' },
  FAMILLE_PLUS: { background: 'var(--bt-gold)', color: '#0a1628' },
}

function mapFeatures(plan: PlanB2C): string[] {
  const badgeLabel = 'Badge multi-support (PC · Mobile · Tablette)'
  return plan.features
    .filter((f) => f.included)
    .map((f) => (f.label.toLowerCase().includes('badge') ? badgeLabel : f.label))
}

type Props = {
  plans: PlanB2C[]
  interval: BillingInterval
  currentPlan: string | null
  isAuthenticated: boolean
  loadingPlan: string | null
  onCheckout: (priceId: string) => void
}

export default function PricingGridB2C({ plans, interval, currentPlan, isAuthenticated, loadingPlan, onCheckout }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1200px] mx-auto px-6">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id
        const priceInfo = plan.prices[interval]
        const amount = priceInfo?.amount ?? 0
        const priceId = priceInfo?.priceId ?? ''
        const pricePerProfile = plan.profiles > 0 ? amount / plan.profiles : amount
        const priceUnit = interval === 'monthly' ? '/mois' : '/an'

        return (
          <PlanCard
            key={plan.id}
            mode="B2C"
            name={plan.name}
            description={DESCRIPTIONS[plan.id] ?? ''}
            price={amount}
            priceUnit={priceUnit}
            subtitle={`${plan.profiles} profil(s)`}
            badges={[
              { label: `${plan.entities} entités`, style: 'gold' },
              { label: `${pricePerProfile.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€/profil`, style: 'muted' },
            ]}
            features={mapFeatures(plan)}
            cta={isCurrent ? 'Plan actuel' : !isAuthenticated ? 'Choisir ce plan' : CTA_LABELS[plan.id] ?? 'Choisir'}
            ctaStyle={CTA_STYLES[plan.id] ?? { background: '#00d4ff', color: '#0a1628' }}
            isPopular={plan.highlighted}
            icon={ICONS[plan.id] ?? 'person'}
            ctaDisabled={isCurrent}
            ctaLoading={loadingPlan === priceId}
            ctaOnClick={
              isCurrent
                ? undefined
                : !isAuthenticated
                ? () => signIn('google', { callbackUrl: '/pricing' })
                : () => onCheckout(priceId)
            }
          />
        )
      })}
    </div>
  )
}
