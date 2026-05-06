// lib/email.ts
// Client Resend et envoi d'emails transactionnels BlockTrust
// ============================================================
// Envois en fire-and-forget : ne bloquent jamais la réponse API.
// Les erreurs sont loguées en console uniquement.

import { Resend } from 'resend'
import type { ReactElement } from 'react'
import {
  CertificateAnchoredEmail,
  type CertificateAnchoredEmailProps,
} from '../emails/CertificateAnchoredEmail'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM = 'BlockTrust <noreply@blocktrust.tech>'

/** Réduit les PII dans les logs (domaine conservé pour le diagnostic). */
export function redactEmailRecipient(to: string | string[]): string {
  const list = Array.isArray(to) ? to : [to]
  return list
    .map((addr) => {
      const at = addr.lastIndexOf('@')
      if (at <= 0) return '[redacted]'
      return `***${addr.slice(at)}`
    })
    .join(', ')
}

export type SendEmailParams = {
  to: string | string[]
  subject: string
  react: ReactElement
  replyTo?: string
}

/**
 * Envoie un email via Resend. Ne lance jamais d'exception.
 * Sans RESEND_API_KEY : log un avertissement et ne fait pas d'appel API.
 */
export async function sendEmail({ to, subject, react, replyTo }: SendEmailParams) {
  try {
    const resend = getResend()
    if (!resend) {
      console.warn('[Email] RESEND_API_KEY manquant — email non envoyé:', {
        to: redactEmailRecipient(to),
        subject,
      })
      return { data: null, error: new Error('RESEND_API_KEY not set') }
    }

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
      ...(replyTo && { replyTo }),
    })

    if (error) {
      console.error('[Email] Erreur Resend:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('[Email] Exception lors de l\'envoi:', err)
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

/**
 * Envoi fire-and-forget : lance l'envoi sans attendre, ne fait jamais échouer la requête.
 * À utiliser dans les routes API pour les emails transactionnels.
 */
export function sendEmailFireAndForget(params: SendEmailParams): void {
  sendEmail(params).catch((err) => {
    console.error('[Email] Envoi échoué (fire-and-forget):', params.subject, err)
  })
}

/**
 * Envoi de la confirmation d'ancrage Polygon (fire-and-forget).
 * Appelé après une mise à jour DB blockchainStatus → ANCHORED.
 */
export function sendCertificateAnchoredEmail(
  to: string,
  props: CertificateAnchoredEmailProps,
): void {
  sendEmailFireAndForget({
    to,
    subject: '⛓️ Votre certificat BLOCKTRUST est ancré sur Polygon',
    react: CertificateAnchoredEmail(props),
  })
}
