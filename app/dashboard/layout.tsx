// app/dashboard/layout.tsx
// Layout pour le dashboard client avec sidebar et vérification du plan
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/app/lib/db'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import DashboardSidebarBoundary from '@/app/components/DashboardSidebarBoundary'
import DashboardChrome from '@/app/components/DashboardChrome'
import DashboardPageChrome from '@/app/components/dashboard/DashboardLayout'
import { hasAuthJsSessionCookie } from '@/app/lib/session-cookie-hints'
import { isRscPrefetchRequest } from '@/app/lib/is-rsc-prefetch-request'
import { rethrowIfRedirect } from '@/app/lib/is-redirect-error'

/** Évite cache / flux RSC sans cookies → auth() null alors que l'utilisateur est connecté */
export const dynamic = 'force-dynamic'

/** Zones connectées : pas d’indexation (évite les extraits Google issus des formulaires internes). */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

// Styles couleurs / titres zone principale : DashboardLayout + globals.css [data-dashboard-main]

export default async function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const session = await auth()
    const rscPrefetch = await isRscPrefetchRequest()

    // Admin → tableau de bord admin
    if (session?.user?.email) {
      const { isAdmin } = await import('@/app/lib/admin')
      if (isAdmin(session.user.email)) {
        redirect('/admin/dashboard')
      }
    }

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

    const user = await prisma.user
      .findUnique({
        where: { email: session.user.email },
        include: { plan: true },
      })
      .catch(() => null)

    if (!user) {
      redirect(
        `/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}&reason=user-not-in-db`
      )
    }

    return (
      <DashboardChrome
        sidebar={
          <DashboardSidebarBoundary>
            <DashboardSidebar />
          </DashboardSidebarBoundary>
        }
      >
        <DashboardPageChrome>{children}</DashboardPageChrome>
      </DashboardChrome>
    )
  } catch (error) {
    rethrowIfRedirect(error)
    console.error('[DashboardSegmentLayout]', error)
    redirect('/auth/signin?callbackUrl=%2Fdashboard&reason=layout-error')
  }
}
