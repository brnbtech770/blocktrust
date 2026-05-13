// app/api/admin/run-surveillance/route.ts
// Déclenchement manuel de l’agent de détection d’anomalies (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/lib/admin-utils'
import { runAnomalyDetection } from '@/lib/agents/anomaly-detector'
import { ensureStrictEmptyBody } from '@/lib/api-json-body'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const invalid = await ensureStrictEmptyBody(req)
  if (invalid) return invalid

  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  try {
    await runAnomalyDetection()
    return NextResponse.json({
      success: true,
      runAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 })
  }
}
