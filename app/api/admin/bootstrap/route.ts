// app/api/admin/bootstrap/route.ts
// Synchronise plan Enterprise + TrustScore + relations MUTUAL entre admins (ADMIN_EMAILS)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/lib/admin-utils'
import { runAdminBootstrapForAllAdminEmails } from '@/lib/admin-bootstrap'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await runAdminBootstrapForAllAdminEmails()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Service indisponible' }, { status: 503 })
  }
}
