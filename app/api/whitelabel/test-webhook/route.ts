// app/api/whitelabel/test-webhook/route.ts
// Déclenche un webhook de test signé HMAC vers le webhookUrl configuré.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { sendWebhook } from '@/lib/webhooks'
import { isPublicWebhookUrl } from '@/lib/ssrf-guard'
import { ensureStrictEmptyBody } from '@/lib/api-json-body'
import { userHasWhiteLabelAccess } from '@/lib/whitelabel-access'
import { checkRateLimitWhitelabelTestAsync } from '@/lib/rate-limit-sensitive'
import { assertSameOriginMutation } from '@/lib/csrf-origin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const invalid = await ensureStrictEmptyBody(req)
  if (invalid) return invalid

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const originGuard = assertSameOriginMutation(req)
  if (!originGuard.ok) {
    return NextResponse.json({ error: originGuard.message }, { status: originGuard.status })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { plan: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true, status: true },
  })
  if (
    !userHasWhiteLabelAccess({
      subscriptionPlan: subscription?.plan,
      subscriptionStatus: subscription?.status,
      userPlanType: user.plan?.type,
    })
  ) {
    return NextResponse.json({ error: 'Plan Business requis' }, { status: 403 })
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

  const testRate = await checkRateLimitWhitelabelTestAsync(user.id)
  if (!testRate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Trop de tests webhook. Réessayez plus tard.' },
      {
        status: 429,
        headers: testRate.retryAfter ? { 'Retry-After': String(testRate.retryAfter) } : {},
      },
    )
  }

  // Anti-SSRF : revalider à chaque test
  const urlCheck = await isPublicWebhookUrl(config.webhookUrl)
  if (!urlCheck.ok) {
    return NextResponse.json(
      {
        error: 'invalid_webhook_url',
        message: 'A public HTTPS URL is required (internal/private addresses are blocked)',
      },
      { status: 400 }
    )
  }

  const result = await sendWebhook(config, {
    type: 'webhook.test',
    data: {
      message: 'BLOCKTRUST™ webhook test',
      whiteLabelConfigId: config.id,
      companyName: config.companyName,
    },
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
