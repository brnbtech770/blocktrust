// lib/kyc-email.ts
// Envoi des emails KYC (templates React Email)
// ============================================================

import { prisma } from '@/app/lib/db'
import { sendEmailFireAndForget } from '@/lib/email'
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

  sendEmailFireAndForget({
    to: user.email,
    subject: subjectApproved,
    react: React.createElement(KYCApprovedEmail, {
      userName: user.name || 'Utilisateur',
    }),
  })
}

export async function sendKYCRejectedEmail(userId: string, reason?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user?.email) return

  sendEmailFireAndForget({
    to: user.email,
    subject: subjectRejected,
    react: React.createElement(KYCRejectedEmail, {
      userName: user.name || 'Utilisateur',
      reason,
    }),
  })
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
  sendEmailFireAndForget({
    to: user.email,
    subject: subjectRetry,
    react: React.createElement(KYCRetryEmail, {
      userName: user.name || 'Utilisateur',
      verificationUrl: url,
    }),
  })
}
