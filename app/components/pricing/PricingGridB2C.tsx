'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import PlanCard from './PlanCard'
import {
  formatPriceFr,
  FAMILLE_ADDON_MAX,
  FAMILLE_ADDON_MONTHLY_EUR,
  FAMILLE_ADDON_YEARLY_PER_MONTH_EUR,
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

function mapFeatures(plan: PlanB2C): string[] {
  const badgeLabel = 'Badge multi-support (PC · Mobile · Tablette)'
  return plan.features
    .filter((f) => f.included)
    .map((f) =>
      f.label.toLowerCase().includes('badge') && !f.label.toLowerCase().includes('preview')
        ? badgeLabel
        : f.label,
    )
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

function signinCheckoutCallbackUrl(priceId: string, addonQuantity?: number) {
  const a = addonQuantity ? `&addonQuantity=${addonQuantity}` : ''
  const confirmPath = `/checkout/confirm?priceId=${encodeURIComponent(priceId)}${a}`
  return `/auth/signin?callbackUrl=${encodeURIComponent(confirmPath)}`
}

function ProfileAddonSelector({
  count,
  setCount,
  unitPerMonth,
}: {
  count: number
  setCount: (n: number) => void
  unitPerMonth: number
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-white/70">Profils supplémentaires</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Retirer un profil"
            onClick={() => setCount(Math.max(0, count - 1))}
            disabled={count <= 0}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-white disabled:opacity-30"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center font-mono text-sm font-bold text-white tabular-nums">{count}</span>
          <button
            type="button"
            aria-label="Ajouter un profil"
            onClick={() => setCount(Math.min(FAMILLE_ADDON_MAX, count + 1))}
            disabled={count >= FAMILLE_ADDON_MAX}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-white disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-white/45">
        {count > 0 ? (
          <>
            + <span className="font-semibold text-white">{formatPriceFr(unitPerMonth * count)}€</span>/mois
            {' '}({count} profil{count > 1 ? 's' : ''} — 5 inclus + {count})
          </>
        ) : (
          <>5 profils inclus · jusqu&apos;à {FAMILLE_ADDON_MAX} en plus (2,99€/mois)</>
        )}
      </p>
    </div>
  )
}

export default function PricingGridB2C({ plans, interval, currentPlan, isAuthenticated, loadingPlan, onCheckout }: Props) {
  const router = useRouter()
  const [familleAddon, setFamilleAddon] = useState<number>(0)
  const addonUnit = interval === 'yearly' ? FAMILLE_ADDON_YEARLY_PER_MONTH_EUR : FAMILLE_ADDON_MONTHLY_EUR

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:grid-cols-4 lg:px-8">
      {plans.map((plan) => {
        const isCurrent = isAuthenticated && currentPlan === plan.id

        // ── Plan gratuit (Découverte) — JAMAIS de checkout Stripe ──────────
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

        // ── Plans payants ──────────────────────────────────────────────────
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
        const billedNote = isYearly ? `Soit ${formatPriceFr(priceInfo.amount)}€ facturés/an` : undefined
        const pricePerProfile = plan.profiles > 0 ? perMonth / plan.profiles : perMonth

        const isFamille = plan.id === 'FAMILLE'
        const addonQuantity = isFamille ? familleAddon : 0

        return (
          <PlanCard
            key={plan.id}
            mode="B2C"
            name={plan.name}
            description={DESCRIPTIONS[plan.id] ?? ''}
            price={perMonth}
            priceUnit="/mois TTC"
            savingBadge={savingEur ? `Économie ${savingEur}€/an` : undefined}
            billedNote={billedNote}
            subtitle={`${plan.profiles} profil(s)`}
            badges={[
              { label: `${plan.entities} contacts enregistrables`, style: 'gold' },
              { label: `${formatPriceFr(pricePerProfile)}€/profil`, style: 'muted' },
            ]}
            features={mapFeatures(plan)}
            accordionFeatures={plan.accordionFeatures}
            extraControl={
              isFamille ? (
                <ProfileAddonSelector count={familleAddon} setCount={setFamilleAddon} unitPerMonth={addonUnit} />
              ) : undefined
            }
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
                ? () => router.push(signinCheckoutCallbackUrl(priceId, addonQuantity))
                : () => onCheckout(priceId, addonQuantity > 0 ? { addonQuantity } : undefined)
            }
          />
        )
      })}
    </div>
  )
}
