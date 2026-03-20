// lib/trust-circle-email.ts
// Envoi des emails Trust Circle (templates React Email)
// ============================================================
// IMPORTANT : tous les envois sont awaités pour éviter que Vercel
// coupe la lambda avant que l'email ne parte.

import { prisma } from '@/app/lib/db'
import { sendEmail } from '@/lib/email'
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
  if (!user?.email) {
    console.warn('[TrustCircle] Invite: user sans email, userId:', toUserId)
    return
  }

  const confirmUrl = `${baseUrl}/trust/confirm/${inviteToken}`
  const { error } = await sendEmail({
    to: user.email,
    subject: getTrustCircleInviteSubject(fromName),
    react: React.createElement(TrustCircleInviteEmail, {
      inviterName: fromName,
      inviterEmail: fromEmail,
      confirmUrl,
    }),
  })
  if (error) {
    console.error('[TrustCircle] Invite email échoué:', { to: user.email, error })
  } else {
    console.log('[TrustCircle] Invite email envoyé à:', user.email)
  }
}

export async function sendTrustCircleExternalInviteEmail(
  email: string,
  toName: string,
  fromName: string,
  inviteToken: string
): Promise<void> {
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`
  const { error } = await sendEmail({
    to: email,
    subject: getTrustCircleExternalInviteSubject(fromName),
    react: React.createElement(TrustCircleExternalInviteEmail, {
      inviterName: fromName,
      recipientName: toName,
      inviteUrl,
    }),
  })
  if (error) {
    console.error('[TrustCircle] External invite email échoué:', { to: email, error })
  } else {
    console.log('[TrustCircle] External invite email envoyé à:', email)
  }
}

export async function sendMutualTrustEmail(userIdA: string, userIdB: string): Promise<void> {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: userIdA }, select: { email: true, name: true } }),
    prisma.user.findUnique({ where: { id: userIdB }, select: { email: true, name: true } }),
  ])
  const partnerNameA = userB?.name ?? 'un utilisateur'
  const partnerNameB = userA?.name ?? 'un utilisateur'

  const sends: Promise<unknown>[] = []
  if (userA?.email) {
    sends.push(
      sendEmail({
        to: userA.email,
        subject: getMutualTrustSubject(partnerNameA),
        react: React.createElement(MutualTrustEmail, {
          userName: userA.name || 'Utilisateur',
          partnerName: partnerNameA,
        }),
      }).then(({ error }) => {
        if (error) console.error('[TrustCircle] Mutual email échoué:', { to: userA.email, error })
        else console.log('[TrustCircle] Mutual email envoyé à:', userA.email)
      })
    )
  }
  if (userB?.email) {
    sends.push(
      sendEmail({
        to: userB.email,
        subject: getMutualTrustSubject(partnerNameB),
        react: React.createElement(MutualTrustEmail, {
          userName: userB.name || 'Utilisateur',
          partnerName: partnerNameB,
        }),
      }).then(({ error }) => {
        if (error) console.error('[TrustCircle] Mutual email échoué:', { to: userB.email, error })
        else console.log('[TrustCircle] Mutual email envoyé à:', userB.email)
      })
    )
  }
  await Promise.all(sends)
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
  await Promise.all(
    ADMIN_EMAILS.map((adminEmail) =>
      sendEmail({ to: adminEmail, subject, react }).then(({ error }) => {
        if (error) console.error('[TrustCircle] Admin email échoué:', { to: adminEmail, error })
        else console.log('[TrustCircle] Admin email envoyé à:', adminEmail)
      })
    )
  )
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

  const { error } = await sendEmail({
    to: user.email,
    subject: subjectManualApproved,
    react: React.createElement(ManualEntryApprovedEmail, {
      userName: user.name || 'Utilisateur',
      entityName,
    }),
  })
  if (error) {
    console.error('[TrustCircle] Approved email échoué:', { to: user.email, error })
  } else {
    console.log('[TrustCircle] Approved email envoyé à:', user.email)
  }
}
