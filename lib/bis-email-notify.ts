/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * Notification email destinataire BIS (tous types d'interaction).
 */
import * as React from 'react'
import { prisma } from '@/app/lib/db'
import { redactEmailRecipient, sendEmail } from '@/lib/email'
import {
  BisNotificationEmail,
  buildBisNotificationSubject,
} from '@/emails/BisNotificationEmail'

const BIS_EMAIL_FROM = 'BLOCKTRUST™ <noreply@blocktrust.tech>'

export type BisEmailNotificationParams = {
  signatureId: string
  senderUserId: string
  recipientEmail: string
  senderDisplayName: string
  senderEmail: string
  interactionType: string
  contextLabel?: string | null
  bisLevel: number
  signedAt: Date
  expiresAt: Date
  verifyUrl: string
}

function formatDateFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function resolveBisSenderDisplayName(
  name: string | null | undefined,
  email: string,
): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  const local = email.split('@')[0] ?? 'Utilisateur'
  return local.charAt(0).toUpperCase() + local.slice(1)
}

async function logBisNotificationAudit(params: {
  signatureId: string
  senderUserId: string
  recipientEmail: string
  success: boolean
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        action: params.success ? 'BIS_NOTIFICATION_SENT' : 'BIS_NOTIFICATION_FAILED',
        resource: 'interaction_signature',
        resourceId: params.signatureId,
        userId: params.senderUserId,
        newValue: {
          recipientEmail: params.recipientEmail,
          bisId: params.signatureId,
          success: params.success,
        },
      },
    })
    .catch(() => null)
}

export async function notifyBisRecipient(
  params: BisEmailNotificationParams,
): Promise<boolean> {
  const signedAtLabel = formatDateFr(params.signedAt)
  const expiresAtLabel = formatDateFr(params.expiresAt)
  const marketingUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? 'https://blocktrust.tech').replace(/\/$/, '')

  const { error } = await sendEmail({
    to: params.recipientEmail,
    from: BIS_EMAIL_FROM,
    subject: buildBisNotificationSubject(params.senderDisplayName),
    react: React.createElement(BisNotificationEmail, {
      senderDisplayName: params.senderDisplayName,
      senderEmail: params.senderEmail,
      interactionType: params.interactionType,
      contextLabel: params.contextLabel,
      bisLevel: params.bisLevel,
      signedAtLabel,
      expiresAtLabel,
      verifyUrl: params.verifyUrl,
      marketingUrl,
    }),
  })

  const success = !error

  await logBisNotificationAudit({
    signatureId: params.signatureId,
    senderUserId: params.senderUserId,
    recipientEmail: params.recipientEmail,
    success,
  })

  if (error) {
    console.error('[BIS] Notification failed:', redactEmailRecipient(params.recipientEmail), error)
  }

  return success
}

/** Fire-and-forget — ne bloque jamais la réponse API. */
export function notifyBisRecipientFireAndForget(
  params: BisEmailNotificationParams,
): void {
  notifyBisRecipient(params).catch((err) => {
    console.error('[BIS] Notification exception:', err)
  })
}

/** @deprecated alias */
export const notifyBisEmailRecipientFireAndForget = notifyBisRecipientFireAndForget
