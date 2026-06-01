// app/dashboard/badge/[id]/page.tsx
// Page pour voir son badge, copier le code embed, télécharger le QR
// ============================================================

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { isDiscoveryExpired, resolveAccountPlan } from '@/lib/plan-features'
import BadgeDashboardClient from './BadgeDashboardClient'

export default async function DashboardBadgePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/')
  }

  const userIsAdmin = isAdmin(session.user.email)

  // Plan Découverte expiré → badge preview désactivé (données conservées).
  const subscription = await prisma.subscription
    .findUnique({ where: { userId: session.user.id }, select: { plan: true } })
    .catch(() => null)
  const planExpired = isDiscoveryExpired(
    resolveAccountPlan(subscription?.plan, { isAdmin: userIsAdmin }),
  )

  return <BadgeDashboardClient isAdmin={userIsAdmin} planExpired={planExpired} />
}
