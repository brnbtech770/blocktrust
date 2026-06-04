'use client'

// Récapitulatif du plan choisi + recueil du consentement contractuel :
//  - case obligatoire : acceptation des CGU et des CGV ;
//  - case B2C (particuliers) : renonciation expresse à l'exécution immédiate (art. 10 CGV).
// Le consentement est ré-contrôlé côté serveur (create-checkout) avant tout paiement.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, ShieldCheck } from 'lucide-react'

type PriceInfo = { amount: number; perMonth?: number; priceId?: string }
type Plan = {
  id: string
  name: string
  prices?: { monthly: PriceInfo; yearly: PriceInfo } | null
}
type PricingResponse = { plans?: Plan[]; plansB2B?: Plan[] }

type Matched = {
  plan: Plan
  segment: 'B2C' | 'B2B'
  interval: 'monthly' | 'yearly'
  unitAmount: number
}

function formatFr(amount: number): string {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function matchPlan(data: PricingResponse, priceId: string): Matched | null {
  const lists: { list: Plan[]; segment: 'B2C' | 'B2B' }[] = [
    { list: data.plans ?? [], segment: 'B2C' },
    { list: data.plansB2B ?? [], segment: 'B2B' },
  ]
  for (const { list, segment } of lists) {
    for (const plan of list) {
      if (!plan.prices) continue
      if (plan.prices.monthly.priceId === priceId) {
        return { plan, segment, interval: 'monthly', unitAmount: plan.prices.monthly.amount }
      }
      if (plan.prices.yearly.priceId === priceId) {
        return { plan, segment, interval: 'yearly', unitAmount: plan.prices.yearly.amount }
      }
    }
  }
  return null
}

export default function CheckoutConfirmClient() {
  const router = useRouter()
  const params = useSearchParams()
  const { data: session } = useSession()

  const priceId = params.get('priceId') ?? ''
  const quantity = params.get('quantity') ? Number(params.get('quantity')) : undefined
  const addonQuantity = params.get('addonQuantity')
    ? Number(params.get('addonQuantity'))
    : undefined

  const [matched, setMatched] = useState<Matched | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [waiver, setWaiver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/pricing')
      .then((res) => res.json())
      .then((data: PricingResponse) => {
        if (!active) return
        setMatched(priceId ? matchPlan(data, priceId) : null)
      })
      .catch(() => {
        if (active) setMatched(null)
      })
      .finally(() => {
        if (active) setLoadingPlan(false)
      })
    return () => {
      active = false
    }
  }, [priceId])

  const isB2C = matched?.segment === 'B2C'
  const isPersonal =
    (session?.user as { accountType?: string } | undefined)?.accountType === 'PERSONAL'
  // Ceinture+bretelles : la renonciation n'apparaît que si plan B2C ET compte PERSONAL.
  const showWaiver = isB2C && isPersonal
  const isTeam = matched?.plan.id === 'TEAM'
  const isFamille = matched?.plan.id === 'FAMILLE'

  const summary = useMemo(() => {
    if (!matched) return null
    const suffix = matched.segment === 'B2B' ? '€ HT' : '€ TTC'
    const period = matched.interval === 'yearly' ? '/an' : '/mois'
    return { unit: matched.unitAmount, suffix, period }
  }, [matched])

  async function handleSubmit() {
    if (!acceptedTerms || !priceId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          acceptedTerms: true,
          ...(showWaiver ? { waiver } : {}),
          ...(quantity != null && Number.isFinite(quantity) ? { quantity } : {}),
          ...(addonQuantity != null && Number.isFinite(addonQuantity) ? { addonQuantity } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        router.push(data.url)
        return
      }
      throw new Error(data.error || 'Erreur lors de la création du paiement')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue')
      setSubmitting(false)
    }
  }

  if (loadingPlan) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-24">
        <Loader2 className="h-5 w-5 animate-spin text-[#00d4ff]" />
      </div>
    )
  }

  if (!matched) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="mb-4 text-white/80">Ce plan n&apos;est plus disponible ou le lien est invalide.</p>
        <Link href="/pricing" className="text-[#00d4ff] hover:underline">
          ← Revenir aux tarifs
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-syne mb-6 text-2xl font-bold text-white sm:text-3xl">
        Confirmer votre abonnement
      </h1>

      {/* Récapitulatif */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{matched.plan.name}</p>
            <p className="text-sm text-white/50">
              {matched.interval === 'yearly' ? 'Engagement annuel' : 'Sans engagement · mensuel'}
            </p>
          </div>
          {summary && (
            <div className="text-right">
              <p className="font-syne text-xl font-bold text-white">
                {formatFr(summary.unit)}
                {summary.suffix}
                <span className="text-sm font-normal text-white/50">{summary.period}</span>
              </p>
              {isTeam && quantity ? (
                <p className="text-xs text-white/50">× {quantity} utilisateurs</p>
              ) : null}
            </div>
          )}
        </div>
        {isFamille && addonQuantity ? (
          <p className="mt-3 border-t border-white/10 pt-3 text-sm text-white/60">
            + {addonQuantity} profil{addonQuantity > 1 ? 's' : ''} supplémentaire{addonQuantity > 1 ? 's' : ''}
          </p>
        ) : null}
      </div>

      {/* Acceptation CGU + CGV (obligatoire) */}
      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#00d4ff]"
        />
        <span className="text-sm text-white/80">
          J&apos;ai lu et j&apos;accepte les{' '}
          <Link
            href="/cgu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00d4ff] hover:underline"
          >
            Conditions générales d&apos;utilisation
          </Link>{' '}
          et les{' '}
          <Link
            href="/cgv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00d4ff] hover:underline"
          >
            Conditions générales de vente
          </Link>
          .
        </span>
      </label>

      {/* Renonciation B2C — particuliers uniquement (art. 10 CGV) */}
      {showWaiver && (
        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <input
            type="checkbox"
            checked={waiver}
            onChange={(e) => setWaiver(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#00d4ff]"
          />
          <span className="text-sm text-white/70">
            Je demande l&apos;exécution immédiate du service et reconnais qu&apos;une fois le service
            pleinement exécuté avant la fin du délai de quatorze (14) jours, je perds mon droit de
            rétractation, conformément à l&apos;article 10 des{' '}
            <Link
              href="/cgv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00d4ff] hover:underline"
            >
              CGV
            </Link>
            . À défaut, je conserve mon droit de rétractation de 14 jours.
          </span>
        </label>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-[#E05252]/30 bg-[#E05252]/10 p-3 text-sm text-[#E05252]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!acceptedTerms || submitting}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-[#0a1628] transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: '#00d4ff' }}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          S&apos;abonner
        </button>
        <Link href="/pricing" className="text-sm text-white/50 hover:text-white/80">
          Annuler
        </Link>
      </div>

      <p className="mt-4 text-xs text-white/35">
        Paiement sécurisé via Stripe. Sans engagement · résiliable à tout moment.
      </p>
    </div>
  )
}
