// app/api/admin/restart-surveillance/route.ts
// Relance manuelle de la chaîne QStash surveillance (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/lib/admin-utils'
import { Client } from '@upstash/qstash'
import { appBaseUrl } from '@/lib/qstash-scheduler'
import { ensureStrictEmptyBody } from '@/lib/api-json-body'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const invalid = await ensureStrictEmptyBody(req)
  if (invalid) return invalid

  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = process.env.QSTASH_TOKEN?.trim()
  if (!token) {
    return NextResponse.json({ error: 'QSTASH_TOKEN non configuré' }, { status: 503 })
  }

  const base = appBaseUrl()
  if (!base) {
    return NextResponse.json({ error: 'URL application absente' }, { status: 503 })
  }

  try {
    const client = new Client({ token })
    const res = await client.publishJSON({
      url: `${base}/api/cron/qstash-surveillance`,
      body: { trigger: 'manual-restart' },
    })

    return NextResponse.json({
      success: true,
      message: 'Surveillance QStash relancée',
      messageId: res.messageId,
    })
  } catch {
    return NextResponse.json(
      { error: 'Impossible de publier sur QStash' },
      { status: 500 },
    )
  }
}
