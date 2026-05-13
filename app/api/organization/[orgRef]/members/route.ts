// app/api/organization/[orgRef]/members/route.ts
// Liste des membres (même contrôle que GET organisation)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { findOrganizationByRef, requireOrgMember } from '@/lib/org-vault-server'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orgRef: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orgRef } = await ctx.params
  const org = await findOrganizationByRef(orgRef)
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const membership = await requireOrgMember(session.user.id, org.id)
  if (!membership) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: org.id, joinedAt: { not: null } },
    include: {
      user: { select: { id: true, email: true, name: true, image: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
  })
}
