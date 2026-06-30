// app/dashboard/subscription/page.tsx
// Page de gestion de l'abonnement
// ============================================================

export const dynamic = 'force-dynamic';

import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SubscriptionClient from '@/app/components/dashboard/SubscriptionClient'
import { getPlanDisplayLabel, resolveEffectivePlan } from '@/lib/plan-features'
import {
  formatPremiumTrialEndFr,
  getPremiumTrialBillingLabel,
  isPremiumTrialSubscription,
} from '@/lib/premium-trial'
import { btErrorDevDetails } from '@/lib/prodLog'

export default async function SubscriptionPage() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      redirect('/')
    }

    // Récupérer l'utilisateur avec sa subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true,
        plan: true,
      },
    })

    if (!user) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Utilisateur non trouvé.</p>
          </div>
        </div>
      )
    }

    const subscription = user.subscription
    const premiumTrial = isPremiumTrialSubscription(subscription)
    // Plan affiché = plan réel résolu (source unique : resolveEffectivePlan, statut Stripe inclus).
    const resolvedPlan = resolveEffectivePlan({
      subscription,
      email: session.user.email,
      planType: user.plan?.type,
    })
    const planName = getPlanDisplayLabel(resolvedPlan, { email: session.user.email })
    const currentPeriodEnd = subscription?.currentPeriodEnd
    const status = subscription?.status || 'inactive'

    return (
      <div>
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            ← Retour au dashboard
          </Link>
        </div>

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Mon abonnement
          </h1>
          <p className="text-gray-400 text-base">
            Gérez votre abonnement BLOCKTRUST
          </p>
        </div>

        {/* Carte abonnement actuel */}
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Plan actuel</h2>
              <p className="text-3xl font-bold text-cyan-400">{planName}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              status === 'active' 
                ? premiumTrial
                  ? 'bg-[#BDA76B]/20 text-[#BDA76B] border border-[#BDA76B]/40'
                  : 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
            }`}>
              {status === 'active' ? (premiumTrial ? 'Essai Premium offert' : 'Actif') : 'Inactif'}
            </span>
          </div>

          {currentPeriodEnd && status === 'active' && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-1">
                {premiumTrial ? 'Fin de l\'essai offert' : 'Prochain renouvellement'}
              </p>
              <p className="text-white font-semibold text-lg">
                {formatPremiumTrialEndFr(new Date(currentPeriodEnd))}
              </p>
              {premiumTrial ? (
                <p className="mt-2 text-sm text-white/55">
                  {getPremiumTrialBillingLabel()} — sans engagement Stripe
                </p>
              ) : null}
            </div>
          )}

          <div className="flex gap-4">
            {status === 'active' && !premiumTrial ? (
              <>
                <SubscriptionClient />
                <Link
                  href="/pricing"
                  className="rounded-lg bg-bt-cyan py-3 px-6 font-sans font-semibold text-navy transition-all hover:bg-bt-cyan/90"
                >
                  Changer de plan
                </Link>
              </>
            ) : status === 'active' && premiumTrial ? (
              <Link
                href="/pricing"
                className="rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/10 py-3 px-6 font-sans font-semibold text-[#BDA76B] transition-all hover:bg-[#BDA76B]/20"
              >
                Voir les offres après l&apos;essai
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="rounded-lg bg-bt-cyan py-3 px-6 font-sans font-semibold text-navy transition-all hover:bg-bt-cyan/90"
              >
                Choisir un plan
              </Link>
            )}
          </div>
        </div>

        {/* Informations du plan */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
          <h2 className="text-xl font-bold text-white mb-4">Détails du plan</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Plan :</span>
              <span className="text-white font-semibold">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Statut :</span>
              <span className="text-white font-semibold">
                {premiumTrial
                  ? 'Essai Premium offert'
                  : status === 'active'
                    ? 'Actif'
                    : status === 'canceled'
                      ? 'Annulé'
                      : 'Inactif'}
              </span>
            </div>
            {subscription?.stripeSubscriptionId && (
              <div className="flex justify-between">
                <span className="text-gray-400">ID Abonnement :</span>
                <span className="text-white font-mono text-sm">{subscription.stripeSubscriptionId.substring(0, 20)}...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error: unknown) {
    btErrorDevDetails(error, 'Erreur lors du chargement de la page abonnement')
    const message = error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
    return (
      <div className="p-8">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 font-semibold mb-2">Erreur lors du chargement</p>
          <p className="text-red-300 text-sm">{message}</p>
        </div>
      </div>
    )
  }
}
