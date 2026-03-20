// app/dashboard/layout.tsx
// Layout pour le dashboard client avec sidebar et vérification du plan
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/app/lib/db'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import { writeAgentDebugLog } from '@/app/lib/agent-debug-467f2c-log'
import { hasAuthJsSessionCookie } from '@/app/lib/session-cookie-hints'
import { isRscPrefetchRequest } from '@/app/lib/is-rsc-prefetch-request'

/** Évite cache / flux RSC sans cookies → auth() null alors que l’utilisateur est connecté */
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const cookieStore = await cookies()
  const sessionCookieHints = cookieStore.getAll().filter(
    (c) =>
      c.name === 'authjs.session-token' ||
      c.name === '__Secure-authjs.session-token' ||
      c.name.startsWith('authjs.session-token.') ||
      c.name.startsWith('__Secure-authjs.session-token.')
  )
  const hasSessionCookie = sessionCookieHints.length > 0
  const hasSession = !!session?.user?.email

  const hdrs = await headers()
  const cookieHeaderLen = (hdrs.get('cookie') ?? '').length
  const nextPrefetch =
    hdrs.get('Next-Router-Prefetch') === '1' ||
    hdrs.get('next-router-prefetch') === '1'
  const secPurpose = hdrs.get('sec-purpose') ?? hdrs.get('Sec-Purpose') ?? ''
  const rscPrefetch = await isRscPrefetchRequest()

  // #region agent log
  await writeAgentDebugLog({
    hypothesisId: 'H2',
    location: 'app/dashboard/layout.tsx:auth',
    message: 'Dashboard auth vs session cookie (pages sans getToken middleware)',
    runId: 'verify-layout',
    data: {
      hasSession,
      hasSessionCookie,
      sessionCookieCount: sessionCookieHints.length,
      mismatchCookieWithoutSession: hasSessionCookie && !hasSession,
      cookieHeaderLen,
      nextPrefetch,
      secPurposeLen: secPurpose ? secPurpose.length : 0,
      rscPrefetch,
      prefetchAuthBypass: rscPrefetch && !hasSession,
    },
  })
  // #endregion

  // Admin → /admin
  if (session?.user?.email) {
    const { isAdmin } = await import('@/app/lib/admin')
    if (isAdmin(session.user.email)) {
      redirect('/admin')
    }
  }

  // Garde-fou session
  if (!session?.user?.email) {
    if (rscPrefetch) {
      return (
        <div
          className="min-h-screen bg-[var(--bt-navy)]"
          aria-busy="true"
          aria-label="Préchargement"
        >
          <div className="sr-only">Préchargement du tableau de bord…</div>
        </div>
      )
    }
    const cookiePresent = await hasAuthJsSessionCookie()
    const reason = cookiePresent ? 'jwt-cookie-unreadable' : 'no-session-cookie'
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}&reason=${reason}`
    )
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
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}&reason=user-not-in-db`
    )
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
      <div className="ml-[220px]">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  )
}
