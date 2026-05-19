// Garde serveur pour les pages /admin (complément layout + middleware).
// ============================================================

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { rethrowIfRedirect } from '@/app/lib/is-redirect-error'

/** À appeler en tête de chaque page admin qui interroge la base. */
export async function requireAdminPage() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      redirect('/auth/signin')
    }
    if (!isAdmin(session.user.email)) {
      redirect('/dashboard')
    }
    return session
  } catch (error) {
    rethrowIfRedirect(error)
    console.error('requireAdminPage error:', error)
    redirect('/auth/signin?reason=admin-error')
  }
}
