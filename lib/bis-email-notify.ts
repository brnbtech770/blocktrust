/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * Notification email destinataire BIS (type EMAIL uniquement).
 */
import * as React from 'react'
import { prisma } from '@/app/lib/db'
import { sendEmail } from '@/lib/email'
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

async function logBisEmailAudit(params: {
  signatureId: string
  senderUserId: string
  success: boolean
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        action: params.success ? 'BIS_EMAIL_SENT' : 'BIS_EMAIL_FAILED',
        resource: 'interaction_signature',
        resourceId: params.signatureId,
        userId: params.senderUserId,
      },
    })
    .catch(() => null)
}

export async function notifyBisEmailRecipient(
  params: BisEmailNotificationParams,
): Promise<void> {
  const signedAtLabel = formatDateFr(params.signedAt)
  const expiresAtLabel = formatDateFr(params.expiresAt)

  const { error } = await sendEmail({
    to: params.recipientEmail,
    from: BIS_EMAIL_FROM,
    subject: buildBisNotificationSubject(params.senderDisplayName),
    react: React.createElement(BisNotificationEmail, {
      senderDisplayName: params.senderDisplayName,
      senderEmail: params.senderEmail,
      contextLabel: params.contextLabel,
      bisLevel: params.bisLevel,
      signedAtLabel,
      expiresAtLabel,
      verifyUrl: params.verifyUrl,
    }),
  })

  await logBisEmailAudit({
    signatureId: params.signatureId,
    senderUserId: params.senderUserId,
    success: !error,
  })

  if (error) {
    console.error('[BIS] Email notification failed:', error)
  }
}

/** Fire-and-forget — ne bloque jamais la réponse API. */
export function notifyBisEmailRecipientFireAndForget(
  params: BisEmailNotificationParams,
): void {
  notifyBisEmailRecipient(params).catch((err) => {
    console.error('[BIS] Email notification exception:', err)
  })
}
