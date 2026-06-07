// app/components/dashboard/PlanBadge.tsx
// Pastille de plan PARTAGÉE — source unique de vérité.
// Dérive TOUJOURS du plan réel : resolveAccountPlan + getPlanDisplayLabel + isInternalAccount.
// Aucun libellé de plan codé en dur par défaut (jamais de plan "par défaut" trompeur).
// ============================================================

import { getPlanDisplayLabel, resolveEffectivePlan } from '@/lib/plan-features'

type PlanBadgeProps = {
  /** Subscription.plan brut (peut être null/undefined → plan gratuit Découverte). */
  subscriptionPlan?: string | null
  /** Subscription.status (active/trialing → payant). Absent → comportement legacy (supposé actif). */
  subscriptionStatus?: string | null
  /** Email du compte affiché : admins (ADMIN_EMAILS) + Johanna → "Compte interne". */
  email?: string | null
  className?: string
}

export default function PlanBadge({ subscriptionPlan, subscriptionStatus, email, className }: PlanBadgeProps) {
  // Statut absent → on suppose « active » pour préserver l'affichage existant ;
  // les appelants disposant du statut le transmettent pour un libellé exact.
  const code = resolveEffectivePlan({
    subscription: subscriptionPlan ? { plan: subscriptionPlan, status: subscriptionStatus ?? 'active' } : null,
    email,
  })
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
