'use client'

import { useState } from 'react'
import { Check, Copy, Mail, Plus } from 'lucide-react'
import { getBisInteractionLabel } from '@/lib/bis-interaction-labels'
import { BisVerifyQrCode } from './BisVerifyQrCode'

export type BisSignSuccessData = {
  signatureId: string
  signature: string
  bisLevel: number
  verifyUrl: string
  expiresAt: string
  notificationRequested?: boolean
  interactionType: string
  recipientEmail: string
}

type BisSignSuccessPanelProps = {
  result: BisSignSuccessData
  onNewSignature: () => void
}

export function BisSignSuccessPanel({ result, onNewSignature }: BisSignSuccessPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 2000)
  }

  const typeLabel = getBisInteractionLabel(result.interactionType)
  const isEmail = result.interactionType === 'EMAIL'
  const isDocument = result.interactionType === 'DOCUMENT'

  const instruction = isEmail
    ? 'Collez ce lien dans votre email pour que votre destinataire puisse vérifier votre identité.'
    : isDocument
      ? 'Envoyez ce lien avec votre document. Le destinataire pourra vérifier que le fichier n\'a pas été modifié.'
      : 'Partagez ce lien avec votre destinataire pour qu\'il puisse vérifier cette interaction signée.'

  return (
    <div className="space-y-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-6">
      <div>
        <p className="flex items-center gap-2 text-base font-semibold text-emerald-300">
          <Check className="h-5 w-5 shrink-0" aria-hidden />
          Signature réussie — {typeLabel}
        </p>
        <p className="mt-1 text-sm text-white/60">
          Niveau BIS {result.bisLevel} · Expire le{' '}
          {new Date(result.expiresAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {result.notificationRequested ? (
        <p className="flex items-center gap-2 text-sm text-white/80">
          <Mail className="h-4 w-4 shrink-0 text-bt-cyan" aria-hidden />
          Notification envoyée à {result.recipientEmail}
        </p>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">Lien de vérification</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <p className="break-all rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2 font-mono text-xs text-bt-cyan sm:text-sm">
              {result.verifyUrl}
            </p>
            <button
              type="button"
              onClick={() => copyText(result.verifyUrl, 'url')}
              className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              <Copy className="h-4 w-4" aria-hidden />
              {copied === 'url' ? 'Lien copié' : 'Copier le lien'}
            </button>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BisVerifyQrCode url={result.verifyUrl} size={140} />
            <p className="text-center text-[10px] text-white/40">Scan pour vérifier</p>
          </div>
        </div>
      </div>

      <p className="rounded-lg border border-white/10 bg-[#0a1628]/60 px-4 py-3 text-sm text-white/70">
        {instruction}
      </p>

      <details className="rounded-lg border border-white/10 bg-[#0a1628]/40">
        <summary className="cursor-pointer px-4 py-3 text-xs text-white/50">
          Signature JWS (intégration avancée)
        </summary>
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <textarea
            readOnly
            rows={3}
            value={result.signature}
            className="w-full rounded border border-white/10 bg-[#0a1628] p-2 font-mono text-xs text-white/80"
          />
          <button
            type="button"
            onClick={() => copyText(result.signature, 'jws')}
            className="mt-2 inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/5"
          >
            <Copy className="h-3 w-3" aria-hidden />
            {copied === 'jws' ? 'Copié' : 'Copier la signature'}
          </button>
        </div>
      </details>

      <button
        type="button"
        onClick={onNewSignature}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-bt-cyan px-5 py-2.5 text-sm font-semibold text-[#0a1628] transition hover:bg-bt-cyan/90 sm:w-auto"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Nouvelle signature
      </button>
    </div>
  )
}
