// lib/trust-circle-email.ts
// Envoi des emails Trust Circle (templates React Email)
// ============================================================

import { prisma } from '@/app/lib/db'
import { sendEmailFireAndForget } from '@/lib/email'
import React from 'react'
import { ADMIN_EMAILS } from '@/app/lib/admin'
import { TrustCircleInviteEmail, getTrustCircleInviteSubject } from '@/emails/TrustCircleInviteEmail'
import {
  TrustCircleExternalInviteEmail,
  getTrustCircleExternalInviteSubject,
} from '@/emails/TrustCircleExternalInviteEmail'
import { MutualTrustEmail, getMutualTrustSubject } from '@/emails/MutualTrustEmail'
import {
  AdminManualRequestEmail,
  getAdminManualRequestSubject,
} from '@/emails/AdminManualRequestEmail'
import { ManualEntryApprovedEmail, subject as subjectManualApproved } from '@/emails/ManualEntryApprovedEmail'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

export async function sendTrustCircleInviteEmail(
  toUserId: string,
  fromName: string,
  fromEmail: string,
  inviteToken: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { email: true },
  })
  if (!user?.email) return

  const confirmUrl = `${baseUrl}/trust/confirm/${inviteToken}`
  sendEmailFireAndForget({
    to: user.email,
    subject: getTrustCircleInviteSubject(fromName),
    react: React.createElement(TrustCircleInviteEmail, {
      inviterName: fromName,
      inviterEmail: fromEmail,
      confirmUrl,
    }),
  })
}

export async function sendTrustCircleExternalInviteEmail(
  email: string,
  toName: string,
  fromName: string,
  inviteToken: string
): Promise<void> {
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`
  sendEmailFireAndForget({
    to: email,
    subject: getTrustCircleExternalInviteSubject(fromName),
    react: React.createElement(TrustCircleExternalInviteEmail, {
      inviterName: fromName,
      recipientName: toName,
      inviteUrl,
    }),
  })
}

export async function sendMutualTrustEmail(userIdA: string, userIdB: string): Promise<void> {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userIdA }, select: { email: true, name: true } }),
    prisma.user.findUnique({ where: { id: userIdB }, select: { email: true, name: true } }),
  ])
  const partnerNameA = userB?.name ?? 'un utilisateur'
  const partnerNameB = userA?.name ?? 'un utilisateur'
  if (userA?.email) {
    sendEmailFireAndForget({
      to: userA.email,
      subject: getMutualTrustSubject(partnerNameA),
      react: React.createElement(MutualTrustEmail, {
        userName: userA.name || 'Utilisateur',
        partnerName: partnerNameA,
      }),
    })
  }
  if (userB?.email) {
    sendEmailFireAndForget({
      to: userB.email,
      subject: getMutualTrustSubject(partnerNameB),
      react: React.createElement(MutualTrustEmail, {
        userName: userB.name || 'Utilisateur',
        partnerName: partnerNameB,
      }),
    })
  }
}

export async function sendAdminManualRequestEmail(
  requestId: string,
  requesterName: string,
  entityName: string,
  entityType: string
): Promise<void> {
  const subject = getAdminManualRequestSubject(requestId)
  const react = React.createElement(AdminManualRequestEmail, {
    requestId,
    requesterName,
    entityName,
    entityType,
  })
  for (const adminEmail of ADMIN_EMAILS) {
    sendEmailFireAndForget({ to: adminEmail, subject, react })
  }
}

export async function sendManualEntryApprovedEmail(
  userId: string,
  entityName: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user?.email) return

  sendEmailFireAndForget({
    to: user.email,
    subject: subjectManualApproved,
    react: React.createElement(ManualEntryApprovedEmail, {
      userName: user.name || 'Utilisateur',
      entityName,
    }),
  })
}
