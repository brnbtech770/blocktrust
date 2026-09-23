// lib/extension-bis-enrichment.ts
// Enrichissement TrustScan — signaux BIS pour verify-sender.
// ============================================================

import { normalizeEmail } from '@/lib/bis-access'
import { getPublicBisVerification } from '@/lib/bis-public-verify'
import { sanitizeDisplayText } from '@/lib/sanitize-display-text'
import {
  normalizeSenderEmail,
  type ExtensionBisVerification,
  type ExtensionVerifyPayload,
} from '@/lib/extension-verify-sender'
import { prisma } from '@/app/lib/db'

export const BIS_MISSING_ALERT_MESSAGE =
  'Ce contact signe habituellement ses interactions. Cet email n\'est PAS signé — vérifiez par un autre canal.'

export function bisSenderMismatchWarning(signedBy: string, receivedFrom: string): string {
  return `Signature BIS détectée mais l'expéditeur ne correspond pas (signé par ${signedBy}, reçu de ${receivedFrom})`
}

export async function countBisFromSender(
  recipientEmail: string,
  senderEmail: string,
): Promise<number> {
  const recipient = normalizeEmail(recipientEmail)
  const sender = normalizeSenderEmail(senderEmail)
  if (!recipient || !sender) return 0

  return prisma.interactionSignature.count({
    where: {
      recipientEmail: recipient,
      senderEmail: sender,
    },
  })
}

export async function enrichExtensionPayloadWithBis(params: {
  payload: ExtensionVerifyPayload
  bisId: string | null
  recipientEmail: string | null
  senderEmail: string
}): Promise<ExtensionVerifyPayload> {
  const senderNorm = normalizeSenderEmail(params.senderEmail)
  const bisCount =
    params.recipientEmail && senderNorm
      ? await countBisFromSender(params.recipientEmail, senderNorm)
      : 0

  const senderUsuallySignsBis = bisCount > 0
  const bisId = params.bisId?.trim() || null
  const bisSignatureDetected = Boolean(bisId)

  let bisVerification: ExtensionBisVerification | null = null
  if (bisId) {
    const verified = await getPublicBisVerification(bisId)
    if (verified) {
      const bisSender = normalizeEmail(verified.senderEmail ?? '')
      const bisRecipient = normalizeEmail(verified.recipientEmail ?? '')
      const viewer = params.recipientEmail ? normalizeEmail(params.recipientEmail) : ''
      const senderMatch = bisSender && senderNorm ? bisSender === senderNorm : null
      const recipientMatch = bisRecipient && viewer ? bisRecipient === viewer : null
      const bindingWarning =
        senderMatch === false
          ? bisSenderMismatchWarning(bisSender, senderNorm)
          : null

      bisVerification = {
        valid: verified.valid,
        bisLevel: verified.bisLevel,
        interactionType: verified.interactionType,
        contextLabel: sanitizeDisplayText(verified.contextLabel),
        signedAt: verified.signedAt,
        expiresAt: verified.expiresAt,
        reason: sanitizeDisplayText(verified.reason ?? null) ?? undefined,
        senderEmail: bisSender || null,
        recipientEmail: bisRecipient || null,
        senderMatch,
        recipientMatch,
        bindingWarning,
      }
    }
  }

  const bisMissingAlert =
    params.payload.status === 'CERTIFIED' &&
    !bisSignatureDetected &&
    senderUsuallySignsBis

  return {
    ...params.payload,
    bisSignatureDetected,
    bisVerification,
    senderUsuallySignsBis,
    bisMissingAlert,
    bisMissingAlertMessage: bisMissingAlert ? BIS_MISSING_ALERT_MESSAGE : null,
  }
}
