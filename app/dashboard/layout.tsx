// app/dashboard/layout.tsx
// Layout pour le dashboard client avec sidebar et vérification du plan
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/db'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import DashboardChrome from '@/app/components/DashboardChrome'
import DashboardPageChrome from '@/app/components/dashboard/DashboardLayout'
import { hasAuthJsSessionCookie } from '@/app/lib/session-cookie-hints'
import { isRscPrefetchRequest } from '@/app/lib/is-rsc-prefetch-request'

/** Évite cache / flux RSC sans cookies → auth() null alors que l'utilisateur est connecté */
export const dynamic = 'force-dynamic'

export default async function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const rscPrefetch = await isRscPrefetchRequest()

  // Admin → /admin
  if (session?.user?.email) {
    const { isAdmin } = await import('@/app/lib/admin')
    if (isAdmin(session.user.email)) {
      redirect('/admin')
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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { plan: true },
  })

  if (!user) {
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent('/dashboard')}&reason=user-not-in-db`
    )
  }

  return (
    <DashboardChrome sidebar={<DashboardSidebar />}>
      <DashboardPageChrome>{children}</DashboardPageChrome>
    </DashboardChrome>
  )
}
