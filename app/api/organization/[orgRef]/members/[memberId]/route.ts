// app/api/organization/[orgRef]/members/[memberId]/route.ts
// Rôle membre + exclusion (OWNER protégé)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import {
  findOrganizationByRef,
  orgRoleCanManageOrgSettings,
  requireOrgMember,
} from '@/lib/org-vault-server'
import { revokeOrganizationMemberAccess } from '@/lib/org-member-revocation'

const patchBody = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']),
})

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ orgRef: string; memberId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orgRef, memberId } = await ctx.params
  const org = await findOrganizationByRef(orgRef)
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const actor = await requireOrgMember(session.user.id, org.id)
  if (!actor || !orgRoleCanManageOrgSettings(actor.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: org.id },
  })
  if (!target?.joinedAt) {
    return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
  }

  if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'Le propriétaire ne peut pas être modifié depuis cette route' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = patchBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const updated = await prisma.organizationMember.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
    select: { id: true, role: true },
  })

  return NextResponse.json({ member: updated })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ orgRef: string; memberId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orgRef, memberId } = await ctx.params
  const org = await findOrganizationByRef(orgRef)
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const actor = await requireOrgMember(session.user.id, org.id)
  if (!actor || !orgRoleCanManageOrgSettings(actor.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const target = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: org.id },
  })
  if (!target?.joinedAt) {
    return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
  }

  if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'Impossible de retirer le propriétaire' }, { status: 403 })
  }

  const revocation = await revokeOrganizationMemberAccess({
    organizationId: org.id,
    targetUserId: target.userId,
    actorUserId: session.user.id,
  })

  await prisma.organizationMember.delete({ where: { id: target.id } }).catch((err) => {
    console.error('[org/members] delete membership failed:', err)
    throw err
  })

  return NextResponse.json({
    ok: true,
    revokedCertificates: revocation.revokedCertificates,
    removedTrustRelations: revocation.removedTrustRelations,
  })
}
