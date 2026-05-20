// app/dashboard/badge/[id]/page.tsx
// Page pour voir son badge, copier le code embed, télécharger le QR
// ============================================================

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import BadgeDashboardClient from './BadgeDashboardClient'

export default async function DashboardBadgePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/')
  }

  const userIsAdmin = isAdmin(session.user.email)

  return <BadgeDashboardClient isAdmin={userIsAdmin} />
}
