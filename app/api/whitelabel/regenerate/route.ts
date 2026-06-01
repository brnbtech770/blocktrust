// app/api/whitelabel/regenerate/route.ts
// Régénère la clé API publique du partenaire White Label.
// La nouvelle clé n'est retournée EN CLAIR qu'une seule fois (à cet appel).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { generateUniqueApiKeyPair, maskApiKey } from '@/lib/api-key'
import { ensureStrictEmptyBody } from '@/lib/api-json-body'
import { userHasWhiteLabelAccess } from '@/lib/whitelabel-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const invalid = await ensureStrictEmptyBody(req)
  if (invalid) return invalid

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { plan: true },
  })
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 })

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

  const { apiKey, apiKeyHash } = await generateUniqueApiKeyPair(prisma)

  // On ne stocke que l'affichage masqué + le hash. La clé en clair n'est renvoyée
  // qu'une seule fois dans la réponse ci-dessous.
  const apiKeyMasked = maskApiKey(apiKey)
  const config = await prisma.whiteLabelConfig.upsert({
    where: { userId: user.id },
    update: { apiKey: apiKeyMasked, apiKeyHash },
    create: {
      userId: user.id,
      companyName: user.companyName ?? user.company ?? user.name ?? 'Mon entreprise',
      apiKey: apiKeyMasked,
      apiKeyHash,
      apiCallsLimit: user.plan?.apiRequestsPerMonth ?? 1000,
    },
  })

  return NextResponse.json({
    apiKey,
    apiKeyMasked,
    rotatedAt: config.updatedAt.toISOString(),
  })
}
