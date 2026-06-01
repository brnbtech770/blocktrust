// app/components/dashboard/DiscoveryExpiredWall.tsx
// Mur d'upgrade affiché quand la période Découverte (30 jours) est terminée.
// Données conservées, vérifications/badge gelés — incitation à passer payant.
// ============================================================

import Link from 'next/link'
import { Lock } from 'lucide-react'

export function DiscoveryExpiredWall() {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[#BDA76B]/40 bg-[#0a1628]">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/10">
            <Lock className="h-5 w-5 text-[#00d4ff]" aria-hidden />
          </div>
          <div>
            <h2 className="font-syne text-lg font-bold text-white">
              Votre période découverte de 30 jours est terminée
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/70">
              Vos données restent conservées. Activez votre certification dès{' '}
              <span className="font-semibold text-[#BDA76B]">2,99€/mois</span> pour réactiver votre
              badge, vos vérifications et l&apos;ancrage sur la blockchain.
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00d4ff] px-6 py-3 font-sans font-semibold text-[#0a1628] transition-all hover:bg-[#00d4ff]/90"
        >
          Activer ma certification
        </Link>
      </div>
    </div>
  )
}
