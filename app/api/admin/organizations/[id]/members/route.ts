// app/api/admin/organizations/[id]/members/route.ts
// Liste des membres d'une organisation (admin)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: id },
    select: {
      id: true,
      role: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { invitedAt: 'asc' },
  })

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      email: m.user.email,
      name: m.user.name,
    })),
  })
}
