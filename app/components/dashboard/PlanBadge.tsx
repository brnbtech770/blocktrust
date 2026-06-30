// app/components/dashboard/PlanBadge.tsx
// Pastille de plan PARTAGÉE — source unique de vérité.
// Dérive TOUJOURS du plan réel : resolveAccountPlan + getPlanDisplayLabel + isInternalAccount.
// Aucun libellé de plan codé en dur par défaut (jamais de plan "par défaut" trompeur).
// ============================================================

import { getPlanDisplayLabel, resolveEffectivePlan, type PlanResolutionSubscription } from '@/lib/plan-features'

type PlanBadgeProps = {
  /** Subscription.plan brut (peut être null/undefined → plan gratuit Découverte). */
  subscriptionPlan?: string | null
  /** Subscription.status (active/trialing → payant). Absent → comportement legacy (supposé actif). */
  subscriptionStatus?: string | null
  stripeSubscriptionId?: string | null
  currentPeriodEnd?: Date | null
  /** Objet subscription complet (prioritaire sur les champs individuels). */
  subscription?: PlanResolutionSubscription | null
  /** Email du compte affiché : admins (ADMIN_EMAILS) + Johanna → "Compte interne". */
  email?: string | null
  className?: string
}

export default function PlanBadge({
  subscriptionPlan,
  subscriptionStatus,
  stripeSubscriptionId,
  currentPeriodEnd,
  subscription,
  email,
  className,
}: PlanBadgeProps) {
  const sub: PlanResolutionSubscription | null =
    subscription ??
    (subscriptionPlan
      ? {
          plan: subscriptionPlan,
          status: subscriptionStatus ?? 'active',
          stripeSubscriptionId: stripeSubscriptionId ?? null,
          currentPeriodEnd: currentPeriodEnd ?? null,
        }
      : null)

  const code = resolveEffectivePlan({ subscription: sub, email })
  const label = getPlanDisplayLabel(code, { email })

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-[#BDA76B]/30 bg-[#BDA76B]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#BDA76B] ${className ?? ''}`}
      title={`Plan : ${label}`}
    >
      {label}
    </span>
  )
}
