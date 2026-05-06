// lib/kyc-email.ts
// Envoi des emails KYC (templates React Email)
// ============================================================

import { prisma } from '@/app/lib/db'
import { redactEmailRecipient, sendEmail } from '@/lib/email'
import React from 'react'
import { KYCApprovedEmail, subject as subjectApproved } from '@/emails/KYCApprovedEmail'
import { KYCRejectedEmail, subject as subjectRejected } from '@/emails/KYCRejectedEmail'
import { KYCRetryEmail, subject as subjectRetry } from '@/emails/KYCRetryEmail'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

export async function sendKYCApprovedEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user?.email) return

  const { error } = await sendEmail({
    to: user.email,
    subject: subjectApproved,
    react: React.createElement(KYCApprovedEmail, {
      userName: user.name || 'Utilisateur',
    }),
  })
  if (error)
    console.error('[KYC] Approved email échoué:', {
      to: redactEmailRecipient(user.email),
      error,
    })
  else console.log('[KYC] Approved email envoyé userId=', userId.slice(0, 8))
}

export async function sendKYCRejectedEmail(userId: string, reason?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user?.email) return

  const { error } = await sendEmail({
    to: user.email,
    subject: subjectRejected,
    react: React.createElement(KYCRejectedEmail, {
      userName: user.name || 'Utilisateur',
      reason,
    }),
  })
  if (error)
    console.error('[KYC] Rejected email échoué:', {
      to: redactEmailRecipient(user.email),
      error,
    })
  else console.log('[KYC] Rejected email envoyé userId=', userId.slice(0, 8))
}

export async function sendKYCRetryEmail(
  userId: string,
  verificationUrl?: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user?.email) return

  const url = verificationUrl || `${baseUrl}/onboarding/verify`
  const { error } = await sendEmail({
    to: user.email,
    subject: subjectRetry,
    react: React.createElement(KYCRetryEmail, {
      userName: user.name || 'Utilisateur',
      verificationUrl: url,
    }),
  })
  if (error)
    console.error('[KYC] Retry email échoué:', {
      to: redactEmailRecipient(user.email),
      error,
    })
  else console.log('[KYC] Retry email envoyé userId=', userId.slice(0, 8))
}
