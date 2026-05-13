// app/api/organization/route.ts
// Liste et création d’organisations B2B (session + plan éligible)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import {
  getOrgUserQuota,
  getSubscriptionPlanCodeForUser,
  hasOrgAccess,
  slugifyOrgName,
} from '@/lib/vault-utils'
import { randomBytes } from 'node:crypto'

const createBody = z.object({
  name: z.string().min(2).max(120),
})

async function uniqueOrgSlug(base: string): Promise<string> {
  let s = base
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.organization.findUnique({ where: { slug: s } })
    if (!exists) return s
    s = `${base}-${randomBytes(2).toString('hex')}`
  }
  return `${base}-${randomBytes(4).toString('hex')}`
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rows = await prisma.organizationMember.findMany({
    where: { userId: session.user.id, joinedAt: { not: null } },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          tier: true,
          createdAt: true,
          _count: { select: { vaults: true, members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return NextResponse.json({
    organizations: rows.map((r) => ({
      id: r.organization.id,
      name: r.organization.name,
      slug: r.organization.slug,
      tier: r.organization.tier,
      createdAt: r.organization.createdAt,
      role: r.role,
      vaultCount: r.organization._count.vaults,
      memberCount: r.organization._count.members,
    })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const planCode = await getSubscriptionPlanCodeForUser(session.user.id)
  if (!hasOrgAccess(planCode)) {
    return NextResponse.json(
      { error: 'Offre équipe requise pour créer une organisation' },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = createBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { name } = parsed.data
  const slugBase = slugifyOrgName(name)
  const slug = await uniqueOrgSlug(slugBase)
  const seats = getOrgUserQuota(planCode)

  const org = await prisma.$transaction(async (tx) => {
    const o = await tx.organization.create({
      data: {
        name: name.trim(),
        slug,
        tier: planCode,
        ownerId: session.user.id,
        maxSeats: seats,
      },
    })
    await tx.organizationMember.create({
      data: {
        organizationId: o.id,
        userId: session.user.id,
        role: 'OWNER',
        joinedAt: new Date(),
      },
    })
    return o
  })

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      tier: org.tier,
    },
  })
}
