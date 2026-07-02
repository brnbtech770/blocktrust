// lib/welcome-email.ts
// Envoi email de bienvenue avec guide d'utilisation
// ============================================================

import * as React from 'react'
import { prisma } from '@/app/lib/db'
import { appBaseUrl, recentAuditLogExists } from '@/lib/agents/agent-utils'
import { sendEmailFireAndForget } from '@/lib/email'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'
import { WelcomeEmail, welcomeEmailSubject } from '@/emails/WelcomeEmail'

export const WELCOME_EMAIL_ACTION = 'WELCOME_EMAIL_SENT'
export const WELCOME_EMAIL_FROM = 'BLOCKTRUST™ <contact@blocktrust.tech>'

export function resolveWelcomeFirstName(
  name: string | null | undefined,
  email: string,
): string {
  const trimmed = name?.trim()
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0]
    if (first) return first
  }
  const local = email.split('@')[0]?.trim()
  return local || 'Utilisateur'
}

export async function getLatestUserBadgeVerifyUrl(userId: string): Promise<string | null> {
  const cert = await prisma.certificate.findFirst({
    where: {
      entity: { userId },
      status: { in: ['ACTIVE', 'PENDING'] },
    },
    orderBy: { issuedAt: 'desc' },
    select: { publicId: true, id: true },
  })
  if (!cert) return null
  return buildPublicVerifyUrl(cert.publicId || cert.id)
}

export async function sendWelcomeEmailIfNeeded(
  userId: string,
  email: string,
  firstName: string,
): Promise<boolean> {
  const alreadySent = await recentAuditLogExists(WELCOME_EMAIL_ACTION, userId, new Date(0))
  if (alreadySent) return false

  const base = appBaseUrl()
  const badgeVerifyUrl = await getLatestUserBadgeVerifyUrl(userId)

  sendEmailFireAndForget({
    to: email,
    from: WELCOME_EMAIL_FROM,
    replyTo: 'contact@blocktrust.tech',
    subject: welcomeEmailSubject,
    react: React.createElement(WelcomeEmail, {
      firstName,
      dashboardUrl: `${base}/dashboard`,
      badgeVerifyUrl,
    }),
  })

  await prisma.auditLog
    .create({
      data: {
        action: WELCOME_EMAIL_ACTION,
        resource: 'user',
        resourceId: userId,
        userId,
      },
    })
    .catch(() => null)

  return true
}
