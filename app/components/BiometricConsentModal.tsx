'use client'

import { ShieldCheck } from 'lucide-react'

interface BiometricConsentModalProps {
  onAccept: () => void
  onDecline: () => void
  isOpen: boolean
}

export function BiometricConsentModal({
  onAccept,
  onDecline,
  isOpen,
}: BiometricConsentModalProps) {
  if (!isOpen) return null

  const items = [
    "Scan de votre pièce d'identité officielle",
    'Capture d\'un selfie pour vérification faciale',
    'Données supprimées après vérification',
    'Aucune donnée biométrique stockée par BLOCKTRUST™',
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="biometric-consent-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#00d4ff]/20 bg-[#0a1628] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00d4ff]/20 bg-[#00d4ff]/10">
            <ShieldCheck className="h-5 w-5 text-[#00d4ff]" aria-hidden />
          </div>
          <div>
            <h2 id="biometric-consent-title" className="text-base font-semibold text-white">
              Vérification d&apos;identité
            </h2>
            <p className="text-xs text-white/40">Consentement requis — RGPD Art. 9</p>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-sm leading-relaxed text-white/70">
            Pour vérifier votre identité, BLOCKTRUST™ utilise{' '}
            <strong className="text-white">Stripe Identity</strong>, qui traite temporairement vos
            données biométriques (reconnaissance faciale).
          </p>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">
              Ce traitement implique :
            </p>
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-white/50">
                  <span className="mt-0.5 text-[#00d4ff]" aria-hidden>
                    ·
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs leading-relaxed text-white/40">
            Ce consentement est distinct de l&apos;acceptation des CGU. Vous pouvez retirer ce
            consentement à tout moment depuis vos paramètres. La vérification d&apos;identité est
            optionnelle mais améliore votre TrustScore.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onAccept}
            className="min-h-[48px] flex-1 rounded-xl bg-[#00d4ff] px-4 py-3 text-sm font-semibold text-[#0a1628] transition hover:bg-[#00d4ff]/90"
          >
            J&apos;accepte la vérification biométrique
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/50 transition hover:border-white/20 hover:text-white/70"
          >
            Refuser
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-white/20">
          Base légale : consentement explicite (RGPD Art. 6.1.a + 9.2.a)
        </p>
      </div>
    </div>
  )
}
