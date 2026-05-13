// app/api/whitelabel/config/route.ts
// Lecture / mise à jour partielle de la configuration White Label de l'utilisateur
// connecté (branding, webhook, permissions limitées).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { generateUniqueApiKeyPair, maskApiKey } from '@/lib/api-key'
import { userHasWhiteLabelAccess } from '@/lib/whitelabel-access'
import { randomBytes } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserAndPlan(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      companyName: true,
      plan: {
        select: {
          whitelabelEnabled: true,
          apiRequestsPerMonth: true,
          type: true,
        },
      },
    },
  })
}

async function assertWhiteLabelAccess(email: string) {
  const user = await getUserAndPlan(email)
  if (!user) {
    return { kind: 'error' as const, response: NextResponse.json({ error: 'user_not_found' }, { status: 404 }) }
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
    return {
      kind: 'error' as const,
      response: NextResponse.json({ error: 'Plan Business requis' }, { status: 403 }),
    }
  }
  return { kind: 'ok' as const, user, subscription }
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
  const gate = await assertWhiteLabelAccess(session.user.email)
  if (gate.kind === 'error') return gate.response
  const { user } = gate

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
  const gate = await assertWhiteLabelAccess(session.user.email)
  if (gate.kind === 'error') return gate.response
  const { user } = gate

  const raw = await req.json().catch(() => null)
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }
  const body = raw as Record<string, unknown>

  const patch: Prisma.WhiteLabelConfigUpdateInput = {}
  const fallbackCompany =
    user.companyName ?? user.company ?? user.name ?? 'Mon entreprise'

  if (typeof body.companyName === 'string' && body.companyName.trim().length > 0) {
    patch.companyName = body.companyName.trim().slice(0, 100)
  }
  const colorRegex = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/
  if (typeof body.primaryColor === 'string' && colorRegex.test(body.primaryColor)) {
    patch.primaryColor = body.primaryColor
  }
  if (typeof body.secondaryColor === 'string' && colorRegex.test(body.secondaryColor)) {
    patch.secondaryColor = body.secondaryColor
  }
  if (typeof body.logoUrl === 'string') {
    const trimmed = body.logoUrl.trim()
    patch.logoUrl = trimmed.length > 0 ? trimmed.slice(0, 500) : null
  }
  if (typeof body.webhookUrl === 'string') {
    const trimmed = body.webhookUrl.trim()
    if (trimmed.length === 0) {
      patch.webhookUrl = null
    } else if (/^https?:\/\//i.test(trimmed)) {
      patch.webhookUrl = trimmed.slice(0, 500)
    } else {
      return NextResponse.json(
        { error: 'invalid_webhook_url', message: 'Must start with http(s)://' },
        { status: 400 }
      )
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  const { apiKey, apiKeyHash } = await generateUniqueApiKeyPair(prisma)

  const companyNameCreate =
    typeof patch.companyName === 'string' ? patch.companyName : fallbackCompany
  const primaryCreate =
    typeof patch.primaryColor === 'string' ? patch.primaryColor : '#00d4ff'
  const secondaryCreate =
    typeof patch.secondaryColor === 'string' ? patch.secondaryColor : '#BDA76B'
  const logoCreate: string | null =
    patch.logoUrl === undefined
      ? null
      : typeof patch.logoUrl === 'string'
        ? patch.logoUrl
        : null
  const webhookCreateResolved: string | null =
    patch.webhookUrl === undefined
      ? null
      : typeof patch.webhookUrl === 'string'
        ? patch.webhookUrl
        : null

  const createData: Prisma.WhiteLabelConfigUncheckedCreateInput = {
    userId: user.id,
    companyName: companyNameCreate,
    primaryColor: primaryCreate,
    secondaryColor: secondaryCreate,
    logoUrl: logoCreate,
    webhookUrl: webhookCreateResolved,
    apiKey,
    apiKeyHash,
    webhookSecret: randomBytes(32).toString('hex'),
    apiCallsLimit: user.plan?.apiRequestsPerMonth ?? 1000,
  }

  const config = await prisma.whiteLabelConfig.upsert({
    where: { userId: user.id },
    update: patch,
    create: createData,
  })

  return NextResponse.json({ config: serializeConfig(config) })
}
