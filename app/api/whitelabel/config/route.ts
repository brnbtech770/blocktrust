// app/api/whitelabel/config/route.ts
// Lecture / mise à jour partielle de la configuration White Label de l'utilisateur
// connecté (branding, webhook, permissions limitées).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { generateUniqueApiKeyPair, maskApiKey } from '@/lib/api-key'
import { randomBytes } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserAndPlan(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { plan: true },
  })
}

function serializeConfig(c: {
  id: string
  companyName: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  apiKey: string
  webhookUrl: string | null
  webhookSecret: string | null
  canEmbed: boolean
  canVerify: boolean
  canIssue: boolean
  apiCallsCount: number
  apiCallsLimit: number
  createdAt: Date
  updatedAt: Date
}) {
  // ⚠️ Ne jamais retourner apiKeyHash. La clé en clair n'est retournée
  // que masquée pour la lecture courante (régénération nécessaire pour la voir).
  return {
    id: c.id,
    companyName: c.companyName,
    primaryColor: c.primaryColor,
    secondaryColor: c.secondaryColor,
    logoUrl: c.logoUrl,
    apiKeyMasked: maskApiKey(c.apiKey),
    webhookUrl: c.webhookUrl,
    webhookConfigured: Boolean(c.webhookSecret),
    canEmbed: c.canEmbed,
    canVerify: c.canVerify,
    canIssue: c.canIssue,
    apiCallsCount: c.apiCallsCount,
    apiCallsLimit: c.apiCallsLimit,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const user = await getUserAndPlan(session.user.email)
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  if (!user.plan?.whitelabelEnabled) {
    return NextResponse.json(
      { error: 'plan_required', message: 'White Label requires a B2B plan' },
      { status: 403 }
    )
  }

  let config = await prisma.whiteLabelConfig.findUnique({ where: { userId: user.id } })

  // Création paresseuse à la 1ère visite : génère apiKey + secret
  if (!config) {
    const { apiKey, apiKeyHash } = await generateUniqueApiKeyPair(prisma)
    const webhookSecret = randomBytes(32).toString('hex')
    config = await prisma.whiteLabelConfig.create({
      data: {
        userId: user.id,
        companyName: user.companyName ?? user.company ?? user.name ?? 'Mon entreprise',
        apiKey,
        apiKeyHash,
        webhookSecret,
        apiCallsLimit: user.plan?.apiRequestsPerMonth ?? 1000,
      },
    })
  }

  return NextResponse.json({ config: serializeConfig(config) })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const user = await getUserAndPlan(session.user.email)
  if (!user) return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
  if (!user.plan?.whitelabelEnabled) {
    return NextResponse.json({ error: 'plan_required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body.companyName === 'string' && body.companyName.trim().length > 0) {
    data.companyName = body.companyName.trim().slice(0, 100)
  }
  const colorRegex = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/
  if (typeof body.primaryColor === 'string' && colorRegex.test(body.primaryColor)) {
    data.primaryColor = body.primaryColor
  }
  if (typeof body.secondaryColor === 'string' && colorRegex.test(body.secondaryColor)) {
    data.secondaryColor = body.secondaryColor
  }
  if (typeof body.logoUrl === 'string') {
    const trimmed = body.logoUrl.trim()
    data.logoUrl = trimmed.length > 0 ? trimmed.slice(0, 500) : null
  }
  if (typeof body.webhookUrl === 'string') {
    const trimmed = body.webhookUrl.trim()
    if (trimmed.length === 0) {
      data.webhookUrl = null
    } else if (/^https?:\/\//i.test(trimmed)) {
      data.webhookUrl = trimmed.slice(0, 500)
    } else {
      return NextResponse.json(
        { error: 'invalid_webhook_url', message: 'Must start with http(s)://' },
        { status: 400 }
      )
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  const { apiKey, apiKeyHash } = await generateUniqueApiKeyPair(prisma)

  const config = await prisma.whiteLabelConfig.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      companyName:
        (data.companyName as string | undefined) ??
        user.companyName ??
        user.company ??
        user.name ??
        'Mon entreprise',
      apiKey,
      apiKeyHash,
      webhookSecret: randomBytes(32).toString('hex'),
      apiCallsLimit: user.plan?.apiRequestsPerMonth ?? 1000,
      ...data,
    },
  })

  return NextResponse.json({ config: serializeConfig(config) })
}
