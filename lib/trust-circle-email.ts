// lib/trust-circle-email.ts
// Envoi des emails Trust Circle (templates React Email)
// ============================================================
// IMPORTANT : tous les envois sont awaités pour éviter que Vercel
// coupe la lambda avant que l'email ne parte.

import { prisma } from '@/app/lib/db'
import { redactEmailRecipient, sendEmail } from '@/lib/email'
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
import { getUserEmailSignature } from '@/lib/email-signature'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

export async function sendTrustCircleInviteEmail(
  toUserId: string,
  fromUserId: string,
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
  const sig = await getUserEmailSignature(fromUserId).catch(() => ({
    senderName: fromName,
    certId: null as string | null,
    verifyUrl: null as string | null,
  }))
  const { error } = await sendEmail({
    to: user.email,
    subject: getTrustCircleInviteSubject(fromName),
    react: React.createElement(TrustCircleInviteEmail, {
      inviterName: fromName,
      inviterEmail: fromEmail,
      confirmUrl,
      senderCertId: sig.certId,
      senderVerifyUrl: sig.verifyUrl,
    }),
  })
  if (error) {
    console.error('[TrustCircle] Invite email échoué:', {
      to: redactEmailRecipient(user.email),
      error,
    })
  } else {
    console.log('[TrustCircle] Invite email envoyé toUserId=', toUserId.slice(0, 8))
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
    console.error('[TrustCircle] External invite email échoué:', {
      to: redactEmailRecipient(email),
      error,
    })
  } else {
    console.log('[TrustCircle] External invite email envoyé')
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
    const emailA = userA.email
    sends.push(
      sendEmail({
        to: emailA,
        subject: getMutualTrustSubject(partnerNameA),
        react: React.createElement(MutualTrustEmail, {
          userName: userA.name || 'Utilisateur',
          partnerName: partnerNameA,
        }),
      }).then(({ error }) => {
        if (error)
          console.error('[TrustCircle] Mutual email échoué:', {
            to: redactEmailRecipient(emailA),
            error,
          })
        else console.log('[TrustCircle] Mutual email envoyé userId=', userIdA.slice(0, 8))
      })
    )
  }
  if (userB?.email) {
    const emailB = userB.email
    sends.push(
      sendEmail({
        to: emailB,
        subject: getMutualTrustSubject(partnerNameB),
        react: React.createElement(MutualTrustEmail, {
          userName: userB.name || 'Utilisateur',
          partnerName: partnerNameB,
        }),
      }).then(({ error }) => {
        if (error)
          console.error('[TrustCircle] Mutual email échoué:', {
            to: redactEmailRecipient(emailB),
            error,
          })
        else console.log('[TrustCircle] Mutual email envoyé userId=', userIdB.slice(0, 8))
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
        if (error)
          console.error('[TrustCircle] Admin email échoué:', {
            to: redactEmailRecipient(adminEmail),
            error,
          })
        else console.log('[TrustCircle] Admin notification envoyée')
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
    console.error('[TrustCircle] Approved email échoué:', {
      to: redactEmailRecipient(user.email),
      error,
    })
  } else {
    console.log('[TrustCircle] Approved email envoyé userId=', userId.slice(0, 8))
  }
}
