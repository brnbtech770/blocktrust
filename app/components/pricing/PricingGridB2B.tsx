'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import PlanCard from './PlanCard'
import {
  formatPriceFr,
  PRICING_CARD_BENEFITS_B2B,
  getAlternateBillingNote,
  getPlanPerMonthAmount,
  getPlanPriceId,
  isPerSeatPlan,
  TEAM_SEATS_MIN,
  TEAM_SEATS_MAX,
  type PlanB2B,
  type BillingInterval,
} from '@/lib/pricing'

const CTA_STYLES: Record<string, { background: string; border?: string; color: string }> = {
  STARTER: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
  TEAM: { background: '#00d4ff', color: '#0a1628' },
  ENTERPRISE: { background: 'transparent', border: '1px solid var(--bt-gold)', color: 'var(--bt-gold)' },
}

const ENTERPRISE_MAILTO =
  'mailto:commercial@blocktrust.tech?subject=Demande%20d%27information%20Entreprise'

type CheckoutOpts = { quantity?: number; addonQuantity?: number }

type Props = {
  plans: PlanB2B[]
  interval: BillingInterval
  currentPlan: string | null
  isAuthenticated: boolean
  loadingPlan: string | null
  onCheckout: (priceId: string, opts?: CheckoutOpts) => void
}

function signinCheckoutCallbackUrl(priceId: string, quantity?: number) {
  const q = quantity != null ? `&quantity=${quantity}` : ''
  const confirmPath = `/checkout/confirm?priceId=${encodeURIComponent(priceId)}${q}`
  return `/auth/signin?callbackUrl=${encodeURIComponent(confirmPath)}`
}

function SeatSelector({
  seats,
  setSeats,
  perUnit,
}: {
  seats: number
  setSeats: (n: number) => void
  perUnit: number
}) {
  const total = perUnit * seats
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-white/70">Utilisateurs</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Retirer un utilisateur"
            onClick={() => setSeats(Math.max(TEAM_SEATS_MIN, seats - 1))}
            disabled={seats <= TEAM_SEATS_MIN}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-white/15 text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center font-mono text-sm font-bold text-white tabular-nums">{seats}</span>
          <button
            type="button"
            aria-label="Ajouter un utilisateur"
            onClick={() => setSeats(Math.min(TEAM_SEATS_MAX, seats + 1))}
            disabled={seats >= TEAM_SEATS_MAX}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-white/15 text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-white/50">
        Total :{' '}
        <span className="font-semibold text-white">{formatPriceFr(total)}€ (HT)</span>/mois
      </p>
    </div>
  )
}

export default function PricingGridB2B({
  plans,
  interval,
  currentPlan,
  isAuthenticated,
  loadingPlan,
  onCheckout,
}: Props) {
  const router = useRouter()
  const [teamSeats, setTeamSeats] = useState<number>(TEAM_SEATS_MIN)

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-3 lg:px-8">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id
        const isEnterprise = plan.id === 'ENTERPRISE'
        const perSeat = isPerSeatPlan(plan.id)
        const hasPrices = plan.prices != null
        const priceId = hasPrices ? (getPlanPriceId(plan, interval) ?? '') : ''
        const perUnit = hasPrices ? (getPlanPerMonthAmount(plan, interval) ?? 0) : null
        const benefits = PRICING_CARD_BENEFITS_B2B[plan.id] ?? []
        const isPopular = plan.id === 'TEAM'
        const isYearly = interval === 'yearly'

        let billedNote: string | undefined
        if (hasPrices && plan.prices) {
          const priceInfo = plan.prices[interval]
          if (perSeat) {
            billedNote = isYearly
              ? `${formatPriceFr(perUnit ?? 0)}€ (HT)/utilisateur · min. ${TEAM_SEATS_MIN} utilisateurs`
              : `${formatPriceFr(perUnit ?? 0)}€ (HT)/utilisateur · min. ${TEAM_SEATS_MIN} utilisateurs`
          } else if (isYearly) {
            billedNote = `Facturé ${formatPriceFr(priceInfo.amount)}€/an (HT)`
          }
        }

        const quantity = perSeat ? teamSeats : undefined
        const altBillingNote =
          hasPrices && !isEnterprise
            ? getAlternateBillingNote(plan, interval, 'HT')
            : undefined

        return (
          <PlanCard
            key={plan.id}
            name={plan.name}
            price={isEnterprise ? 'Sur devis' : (perUnit ?? 0)}
            taxLabel={isEnterprise ? undefined : '(HT)'}
            priceUnit={isEnterprise ? undefined : perSeat ? '/mois/utilisateur' : '/mois'}
            billedNote={billedNote}
            altBillingNote={altBillingNote}
            features={benefits}
            extraControl={
              perSeat && perUnit != null ? (
                <SeatSelector seats={teamSeats} setSeats={setTeamSeats} perUnit={perUnit} />
              ) : undefined
            }
            cta={isEnterprise ? 'Contactez-nous' : isCurrent ? 'Plan actuel' : 'Choisir ce plan'}
            ctaStyle={CTA_STYLES[plan.id] ?? { background: '#00d4ff', color: '#0a1628' }}
            isPopular={isPopular}
            ctaDisabled={isCurrent}
            ctaLoading={hasPrices && loadingPlan === priceId}
            ctaHref={isEnterprise ? ENTERPRISE_MAILTO : undefined}
            ctaOnClick={
              isEnterprise || isCurrent
                ? undefined
                : !isAuthenticated
                  ? hasPrices && priceId
                    ? () => router.push(signinCheckoutCallbackUrl(priceId, quantity))
                    : () => router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`)
                  : hasPrices
                    ? () => onCheckout(priceId, quantity != null ? { quantity } : undefined)
                    : undefined
            }
          />
        )
      })}
    </div>
  )
}
