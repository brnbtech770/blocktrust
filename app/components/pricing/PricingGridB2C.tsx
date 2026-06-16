'use client'

import { useRouter } from 'next/navigation'
import PlanCard, { type PlanCardFeature } from './PlanCard'
import {
  formatPriceFr,
  type PlanB2C,
  type BillingInterval,
} from '@/lib/pricing'

const DESCRIPTIONS: Record<string, string> = {
  DISCOVERY: 'Testez BLOCKTRUST gratuitement',
  ESSENTIEL: 'Protection personnelle de base',
  PREMIUM: 'Protection personnelle avancée',
  FAMILLE: 'Protégez toute votre famille',
}

const ICONS: Record<string, 'person' | 'shield' | 'group' | 'crown'> = {
  DISCOVERY: 'person',
  ESSENTIEL: 'person',
  PREMIUM: 'shield',
  FAMILLE: 'group',
}

const CTA_LABELS: Record<string, string> = {
  ESSENTIEL: 'Choisir Essentiel',
  PREMIUM: 'Choisir Premium',
  FAMILLE: 'Choisir Famille',
}

const CTA_STYLES: Record<string, { background: string; border?: string; color: string }> = {
  DISCOVERY: { background: 'var(--bt-gold)', color: '#0a1628' },
  ESSENTIEL: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
  PREMIUM: { background: '#00d4ff', color: '#0a1628' },
  FAMILLE: { background: 'transparent', border: '1px solid #00d4ff', color: '#00d4ff' },
}

function mapFeatures(plan: PlanB2C): PlanCardFeature[] {
  return plan.features.map((f) => ({ label: f.label, included: f.included }))
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

export default function PricingGridB2C({ plans, interval, currentPlan, isAuthenticated, loadingPlan, onCheckout }: Props) {
  const router = useRouter()

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-4 lg:px-8">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id

        if (plan.isFree || !plan.prices) {
          return (
            <PlanCard
              key={plan.id}
              mode="B2C"
              name={plan.name}
              description={DESCRIPTIONS[plan.id] ?? ''}
              price="Gratuit"
              subtitle={`${plan.profiles} profil`}
              badges={[
                { label: `${plan.entities} contacts`, style: 'gold' },
                { label: '30 jours', style: 'muted' },
              ]}
              features={mapFeatures(plan)}
              accordionFeatures={plan.accordionFeatures}
              cta={isCurrent ? 'Plan actuel' : 'Commencer gratuitement'}
              ctaStyle={CTA_STYLES[plan.id] ?? { background: 'var(--bt-gold)', color: '#0a1628' }}
              isPopular={plan.highlighted}
              icon={ICONS[plan.id] ?? 'person'}
              ctaDisabled={isCurrent}
              ctaOnClick={
                isCurrent
                  ? undefined
                  : isAuthenticated
                  ? () => router.push('/dashboard')
                  : () => router.push('/auth/signin?callbackUrl=%2Fdashboard')
              }
            />
          )
        }

        const priceInfo = plan.prices[interval]
        const priceId = priceInfo?.priceId ?? ''
        const isYearly = interval === 'yearly'
        const perMonth =
          isYearly && 'perMonth' in priceInfo && typeof priceInfo.perMonth === 'number'
            ? priceInfo.perMonth
            : priceInfo.amount
        const savingEur =
          isYearly && 'savingEur' in priceInfo && typeof priceInfo.savingEur === 'number'
            ? priceInfo.savingEur
            : null
        const billedNote = isYearly ? `Paiement annuel ${formatPriceFr(priceInfo.amount)}€ (TTC)` : undefined
        const pricePerProfile = plan.profiles > 0 ? perMonth / plan.profiles : perMonth

        const monthlyAmount = plan.prices.monthly.amount
        const yearly = plan.prices.yearly
        const ctaMention = isYearly
          ? `Ou démarrer à ${formatPriceFr(monthlyAmount)}€/mois (TTC) sans engagement`
          : `Ou ${formatPriceFr(yearly.perMonth)}€/mois (TTC) · paiement annuel · Économisez ${yearly.savingEur}€/an`

        const profileBadge =
          plan.profiles > 1
            ? `${formatPriceFr(pricePerProfile)}€/mois (TTC) par profil`
            : `${formatPriceFr(pricePerProfile)}€/mois (TTC)`

        return (
          <PlanCard
            key={plan.id}
            mode="B2C"
            name={plan.name}
            description={DESCRIPTIONS[plan.id] ?? ''}
            price={perMonth}
            priceUnit="/mois (TTC)"
            savingBadge={savingEur ? `Économisez ${savingEur}€/an` : undefined}
            billedNote={billedNote}
            subtitle={`${plan.profiles} profil(s)`}
            badges={[
              { label: `${plan.entities} contacts enregistrables`, style: 'gold' },
              { label: profileBadge, style: 'muted' },
            ]}
            features={mapFeatures(plan)}
            accordionFeatures={plan.accordionFeatures}
            ctaMention={ctaMention}
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
                ? () => router.push(signinCheckoutCallbackUrl(priceId))
                : () => onCheckout(priceId)
            }
          />
        )
      })}
    </div>
  )
}
