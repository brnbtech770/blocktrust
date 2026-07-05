// app/api/organization/[orgRef]/invite/route.ts
// Invitation membre équipe (utilisateur BLOCKTRUST existant)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { findOrganizationByRef, orgRoleCanInvite, requireOrgMember } from '@/lib/org-vault-server'
import { sendEmailFireAndForget } from '@/lib/email'
import { getOrgUserQuota } from '@/lib/vault-utils'
import React from 'react'

const inviteBody = z.object({
  email: z.string().email(),
})

export async function POST(
  req: Request,
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

  const inviterMembership = await requireOrgMember(session.user.id, org.id)
  if (!inviterMembership || !orgRoleCanInvite(inviterMembership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = inviteBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const emailNorm = parsed.data.email.trim().toLowerCase()
  const invitee = await prisma.user.findFirst({
    where: { email: { equals: emailNorm, mode: 'insensitive' } },
    select: { id: true, email: true },
  })

  if (!invitee) {
    return NextResponse.json(
      {
        error:
          'Aucun compte BLOCKTRUST avec cette adresse. La personne doit d’abord créer un compte avec cette adresse e-mail, puis vous pourrez l’inviter dans l’équipe.',
        code: 'USER_NOT_FOUND',
      },
      { status: 404 },
    )
  }

  if (invitee.id === session.user.id) {
    return NextResponse.json(
      {
        error:
          'Vous êtes déjà membre de cette organisation (propriétaire ou invité). Utilisez un autre email pour inviter un collègue.',
        code: 'SELF_INVITE',
      },
      { status: 409 },
    )
  }

  const existing = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: org.id, userId: invitee.id },
    },
  })
  if (existing?.joinedAt) {
    return NextResponse.json({ error: 'Cette personne est déjà dans l’équipe' }, { status: 409 })
  }

  const seatCap = getOrgUserQuota(org.tier)
  const joinedCount = await prisma.organizationMember.count({
    where: { organizationId: org.id, joinedAt: { not: null } },
  })
  const hardCap = Math.min(org.maxSeats, seatCap)
  if (joinedCount >= hardCap) {
    return NextResponse.json(
      { error: 'Nombre maximum de membres atteint pour cette organisation' },
      { status: 403 },
    )
  }

  if (existing) {
    await prisma.organizationMember.update({
      where: { id: existing.id },
      data: { joinedAt: new Date(), role: 'MEMBER' },
    })
  } else {
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: invitee.id,
        role: 'MEMBER',
        joinedAt: new Date(),
      },
    })
  }

  const inviter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })

  const origin = new URL(req.url).origin
  const callbackUrl = `${origin}/dashboard/organization/${org.slug}`
  const signInUrl = `${origin}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`

  const { OrgInviteEmail, subject } = await import('@/emails/OrgInviteEmail')
  const { getUserEmailSignature } = await import('@/lib/email-signature')
  const sig = await getUserEmailSignature(session.user.id).catch(() => ({
    senderName: inviter?.name?.trim() || inviter?.email || 'Utilisateur BLOCKTRUST',
    certId: null as string | null,
    verifyUrl: null as string | null,
  }))
  sendEmailFireAndForget({
    to: invitee.email ?? emailNorm,
    subject,
    react: React.createElement(OrgInviteEmail, {
      orgName: org.name,
      inviterName: inviter?.name ?? inviter?.email ?? null,
      signInUrl,
      senderCertId: sig.certId,
      senderVerifyUrl: sig.verifyUrl,
    }),
  })

  return NextResponse.json({ ok: true })
}
