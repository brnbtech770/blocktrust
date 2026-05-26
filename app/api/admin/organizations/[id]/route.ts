// app/api/admin/organizations/[id]/route.ts
// Actions admin sur une organisation B2B
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

const ORG_TIERS = ['STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE', 'SUSPENDED'] as const

const patchSchema = z.object({
  tier: z.enum(['STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE']).optional(),
  action: z.enum(['suspend', 'unsuspend']).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, tier: true, name: true },
  })
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const { tier, action } = parsed.data
  let newTier = org.tier

  if (action === 'suspend') {
    if (org.tier === 'SUSPENDED') {
      return NextResponse.json({ success: true, tier: 'SUSPENDED' })
    }
    newTier = 'SUSPENDED'
  } else if (action === 'unsuspend' && tier) {
    newTier = tier
  } else if (tier) {
    newTier = tier
  } else {
    return NextResponse.json({ error: 'Action ou tier requis' }, { status: 400 })
  }

  if (!(ORG_TIERS as readonly string[]).includes(newTier)) {
    return NextResponse.json({ error: 'Tier invalide' }, { status: 400 })
  }

  await prisma.organization.update({
    where: { id },
    data: { tier: newTier },
  })

  await prisma.auditLog
    .create({
      data: {
        action: action === 'suspend' ? 'ADMIN_ORG_SUSPENDED' : 'ADMIN_ORG_TIER_CHANGED',
        resource: 'organization',
        resourceId: id,
        userId: session.user.id,
        oldValue: { tier: org.tier } as Prisma.InputJsonValue,
        newValue: { tier: newTier, previousTier: org.tier } as Prisma.InputJsonValue,
      },
    })
    .catch(() => null)

  return NextResponse.json({ success: true, tier: newTier })
}
