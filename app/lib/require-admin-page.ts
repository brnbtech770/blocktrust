// Garde serveur pour les pages /admin (complément layout + middleware).
// ============================================================

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'

/** À appeler en tête de chaque page admin qui interroge la base. */
export async function requireAdminPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent('/admin/dashboard')}`
    )
  }
  if (!isAdmin(session.user.email)) {
    redirect('/dashboard')
  }
  return session
}
