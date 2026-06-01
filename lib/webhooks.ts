// lib/webhooks.ts
// Émission de webhooks sortants signés HMAC-SHA256 vers les partenaires
// White Label.
// ============================================================
//
// Signature : `X-BlockTrust-Signature` = HMAC-SHA256(secret, payload).digest('hex')
// Le partenaire vérifie côté serveur en recomputant le HMAC du body brut.

import { createHmac } from 'node:crypto'
import { btErrorDevDetails, btLog } from './prodLog'
import { isPublicWebhookUrl } from './ssrf-guard'

export type WhiteLabelWebhookConfig = {
  webhookUrl?: string | null
  webhookSecret?: string | null
}

export type WebhookEventType =
  | 'verification.completed'
  | 'badge.created'
  | 'kyc.approved'
  | 'webhook.test'

export type WebhookEvent = {
  type: WebhookEventType
  data: Record<string, unknown>
}

export type SendWebhookResult = {
  ok: boolean
  status?: number
  error?: string
  skipped?: boolean
}

const DEFAULT_TIMEOUT_MS = 5_000

/**
 * Envoie un webhook signé. Ne lève jamais d'exception : retourne un résultat
 * structuré. Si `webhookUrl` est manquant, retourne `{ ok: true, skipped: true }`.
 */
export async function sendWebhook(
  config: WhiteLabelWebhookConfig,
  event: WebhookEvent,
  options: { timeoutMs?: number } = {}
): Promise<SendWebhookResult> {
  if (!config.webhookUrl) {
    return { ok: true, skipped: true }
  }

  // Anti-SSRF : valider l'URL (HTTPS + IP résolue publique) AVANT tout fetch.
  // Bloque loopback / link-local (169.254.169.254 métadonnées cloud) / RFC1918 / ULA.
  const urlCheck = await isPublicWebhookUrl(config.webhookUrl)
  if (!urlCheck.ok) {
    btErrorDevDetails(
      { context: 'Webhook delivery', reason: urlCheck.reason },
      'Webhook URL bloquée (garde anti-SSRF)'
    )
    return { ok: false, error: 'blocked_url' }
  }

  const payload = JSON.stringify({
    event: event.type,
    data: event.data,
    timestamp: new Date().toISOString(),
    source: 'blocktrust',
  })

  const secret = config.webhookSecret ?? ''
  const signature = createHmac('sha256', secret).update(payload).digest('hex')

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  )

  try {
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BlockTrust-Signature': signature,
        'X-BlockTrust-Event': event.type,
        'User-Agent': 'BlockTrust-Webhook/1.0',
      },
      body: payload,
      signal: controller.signal,
    })

    if (!res.ok) {
      btErrorDevDetails(
        { context: 'Webhook delivery', url: config.webhookUrl, status: res.status },
        'Webhook delivery non-2xx'
      )
      return { ok: false, status: res.status, error: `HTTP ${res.status}` }
    }

    btLog(
      `[Webhook] ${event.type} → ${config.webhookUrl} (${res.status})`,
      'Webhook delivered'
    )
    return { ok: true, status: res.status }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    btErrorDevDetails(
      { context: 'Webhook delivery', url: config.webhookUrl, error: message },
      'Webhook delivery failed'
    )
    return { ok: false, error: message }
  } finally {
    clearTimeout(timeout)
  }
}
