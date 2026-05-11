'use client'

import { useState } from 'react'
import { Check, Copy, ScanLine } from 'lucide-react'

/** Lien public de partage (même valeur que les QR statiques partagés). */
const SHARE_VERIFY_ORIGIN = 'https://blocktrust.tech'

type VerifyBadgeButtonProps = {
  certId: string
  /**
   * `copy` : dashboard — le titulaire copie le lien pour ses interlocuteurs.
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

  if (behavior === 'copy') {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            const url = `${SHARE_VERIFY_ORIGIN}/verify?certId=${encodeURIComponent(certId)}`
            void navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/10 py-3 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/20"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              Lien copié !
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 shrink-0" aria-hidden />
              Copier le lien de vérification
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs leading-relaxed text-white/30">
          Partagez ce lien — vos interlocuteurs vérifient votre identité en 1 clic, sans compte
          BLOCKTRUST.
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
