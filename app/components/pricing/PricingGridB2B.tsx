'use client'

import { useRouter } from 'next/navigation'
import PlanCard from './PlanCard'
import { formatPriceFr, type PlanB2B, type BillingInterval } from '@/lib/pricing'

const DESCRIPTIONS: Record<string, string> = {
  STARTER: 'Indépendants & très petites équipes',
  TEAM: 'Pour les équipes en croissance',
  ENTERPRISE: 'Pour les grandes organisations',
}

const CTA_STYLES: Record<string, { background: string; border?: string; color: string }> = {
  STARTER: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
  TEAM: { background: '#00d4ff', color: '#0a1628' },
  ENTERPRISE: { background: 'transparent', border: '1px solid var(--bt-gold)', color: 'var(--bt-gold)' },
}

const ICONS: Record<string, 'person' | 'shield' | 'group' | 'building' | 'crown'> = {
  STARTER: 'person',
  TEAM: 'group',
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
    <>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 lg:px-8">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id
        const isEnterprise = plan.id === 'ENTERPRISE'
        const hasPrices = plan.prices != null
        const priceInfo = hasPrices ? plan.prices?.[interval] : null
        const priceId = priceInfo?.priceId ?? ''
        const isYearly = interval === 'yearly'

        const displayPrice = priceInfo
          ? isYearly && 'perMonth' in priceInfo && typeof priceInfo.perMonth === 'number'
            ? priceInfo.perMonth
            : priceInfo.amount
          : ('Sur devis' as const)
        const savingBadge =
          isYearly && priceInfo && 'saving' in priceInfo && priceInfo.saving
            ? `-${priceInfo.saving.replace('%', '')}%`
            : undefined

        return (
          <PlanCard
            key={plan.id}
            mode="B2B"
            name={plan.name}
            description={DESCRIPTIONS[plan.id] ?? ''}
            price={displayPrice}
            priceUnit={hasPrices ? ' HT/user/mois' : undefined}
            savingBadge={savingBadge}
            priceTaxNote={hasPrices ? 'Prix HT · TVA 20% en sus' : undefined}
            subtitle={plan.users}
            badges={[{ label: 'Multi-support inclus', style: 'multiSupport' }]}
            features={mapFeatures(plan)}
            accordionFeatures={plan.accordionFeatures}
            cta={
              isEnterprise
                ? 'Parler à un expert'
                : isCurrent
                ? 'Plan actuel'
                : !isAuthenticated
                ? 'Choisir ce plan'
                : `Choisir ${plan.name}`
            }
            ctaStyle={CTA_STYLES[plan.id] ?? { background: '#00d4ff', color: '#0a1628' }}
            isPopular={plan.highlighted}
            icon={ICONS[plan.id] ?? 'person'}
            ctaDisabled={isCurrent}
            ctaLoading={hasPrices && loadingPlan === priceId}
            ctaHref={isEnterprise ? 'mailto:commercial@blocktrust.tech' : undefined}
            ctaOnClick={
              isEnterprise || isCurrent
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
      <p className="mx-auto mt-6 max-w-5xl px-4 text-center text-xs text-white/30 sm:px-6 lg:px-8">
        Prix HT · TVA 20% en sus · Sans engagement · White Label en option
      </p>
    </>
  )
}
