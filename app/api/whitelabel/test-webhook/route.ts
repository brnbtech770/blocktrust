// app/api/whitelabel/test-webhook/route.ts
// Déclenche un webhook de test signé HMAC vers le webhookUrl configuré.
// ============================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { sendWebhook } from '@/lib/webhooks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { plan: true },
  })
  if (!user || !user.plan?.whitelabelEnabled) {
    return NextResponse.json({ error: 'plan_required' }, { status: 403 })
  }

  const config = await prisma.whiteLabelConfig.findUnique({
    where: { userId: user.id },
  })
  if (!config) {
    return NextResponse.json({ error: 'config_not_found' }, { status: 404 })
  }
  if (!config.webhookUrl) {
    return NextResponse.json(
      { error: 'no_webhook_url', message: 'Configure a webhook URL first' },
      { status: 400 }
    )
  }

  const result = await sendWebhook(config, {
    type: 'webhook.test',
    data: {
      message: 'BlockTrust webhook test',
      whiteLabelConfigId: config.id,
      companyName: config.companyName,
    },
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
