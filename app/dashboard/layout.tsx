// app/dashboard/layout.tsx
// Layout pour le dashboard client avec sidebar et vérification du plan
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/db'
import DashboardSidebar from '@/app/components/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // La vérification de session est maintenant dans le middleware
  // On garde cette vérification comme fallback de sécurité
  if (!session?.user?.email) {
    redirect('/')
  }

  console.log('[DEBUG] Fetching user from database');
  // Récupérer l'utilisateur avec son plan
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { plan: true },
  })
  console.log('[DEBUG] After user query', {hasUser: !!user, hasPlanId: !!user?.planId, hasStripeCustomerId: !!user?.stripeCustomerId});

  if (!user) {
    console.log('[DEBUG] Redirecting: no user');
    redirect('/')
  }

  // Vérifier si l'utilisateur a un plan actif (optionnel pour le moment)
  // Temporairement désactivé pour permettre l'accès au dashboard
  // if (!user.planId) {
  //   // Si l'utilisateur a un stripeCustomerId, vérifier directement dans Stripe
  //   // (au cas où le webhook n'a pas encore été traité)
  //   if (user.stripeCustomerId) {
  //     const { checkAndUpdateUserPlan } = await import('@/app/lib/stripe-helpers')
  //     const planId = await checkAndUpdateUserPlan(user.id, user.stripeCustomerId)

  //     if (planId) {
  //       // Plan mis à jour, continuer avec le layout
  //     } else {
  //       // Si pas de plan et pas de subscription active, rediriger vers pricing
  //       redirect('/pricing?message=Choisissez une offre pour continuer')
  //     }
  //   } else {
  //     // Si pas de plan et pas de subscription active, rediriger vers pricing
  //     redirect('/pricing?message=Choisissez une offre pour continuer')
  //   }
  // }

  console.log('[DEBUG] Rendering layout');
  return (
    <div className="min-h-screen bg-[var(--bt-navy)]">
      <DashboardSidebar />
      <div className="ml-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  )
}
