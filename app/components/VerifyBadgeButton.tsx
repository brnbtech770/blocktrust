'use client'

import { useState } from 'react'
import { Check, Copy, ScanLine } from 'lucide-react'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

type VerifyBadgeButtonProps = {
  certId: string
  /**
   * `copy` : dashboard — génère un lien rotatif (`?vt=`) pour le titulaire.
   * `open` : page publique / visiteur — ouverture de la vérification dans un nouvel onglet.
   */
  behavior?: 'copy' | 'open'
  /** Si `behavior === 'open'` et fourni, prévaut (ex. lien dynamique complet). */
  href?: string
}

export default function VerifyBadgeButton({
  certId,
  behavior = 'open',
  href,
}: VerifyBadgeButtonProps) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  if (behavior === 'copy') {
    return (
      <>
        <button
          type="button"
          disabled={generating}
          onClick={() => {
            void (async () => {
              setGenerating(true)
              try {
                const res = await fetch('/api/verify/generate-link', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ certificateId: certId, ttlHours: 24 }),
                })
                const data = (await res.json()) as {
                  verifyUrl?: string
                  message?: string
                }
                if (!res.ok || !data.verifyUrl) {
                  alert(
                    typeof data.message === 'string'
                      ? data.message
                      : 'Impossible de générer le lien sécurisé.',
                  )
                  return
                }
                const ok = await copyToClipboard(data.verifyUrl)
                if (!ok) return
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              } catch {
                alert('Erreur réseau.')
              } finally {
                setGenerating(false)
              }
            })()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/10 py-3 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/20 disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              Lien sécurisé copié
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 shrink-0" aria-hidden />
              {generating ? 'Génération…' : 'Copier le lien sécurisé'}
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs leading-relaxed text-white/30">
          Un lien temporaire est généré à chaque copie. Vos interlocuteurs vérifient votre identité
          en 1 clic, sans compte BLOCKTRUST.
        </p>
      </>
    )
  }

  const target =
    href ?? `/verify?certId=${encodeURIComponent(certId)}`

  return (
    <a
      href={target}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#00d4ff]/30 bg-[#00d4ff]/10 py-2.5 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/20"
    >
      <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
      Vérifier ce badge
    </a>
  )
}
