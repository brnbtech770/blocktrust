// app/api/whitelabel/regenerate/route.ts
// Régénère la clé API publique du partenaire White Label.
// La nouvelle clé n'est retournée EN CLAIR qu'une seule fois (à cet appel).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { generateUniqueApiKeyPair, maskApiKey } from '@/lib/api-key'
import { ensureStrictEmptyBody } from '@/lib/api-json-body'

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
  if (!user.plan?.whitelabelEnabled) {
    return NextResponse.json({ error: 'plan_required' }, { status: 403 })
  }

  const { apiKey, apiKeyHash } = await generateUniqueApiKeyPair(prisma)

  const config = await prisma.whiteLabelConfig.upsert({
    where: { userId: user.id },
    update: { apiKey, apiKeyHash },
    create: {
      userId: user.id,
      companyName: user.companyName ?? user.company ?? user.name ?? 'Mon entreprise',
      apiKey,
      apiKeyHash,
      apiCallsLimit: user.plan?.apiRequestsPerMonth ?? 1000,
    },
  })

  return NextResponse.json({
    apiKey,
    apiKeyMasked: maskApiKey(apiKey),
    rotatedAt: config.updatedAt.toISOString(),
  })
}
