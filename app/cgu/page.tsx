// Conditions générales d'utilisation (placeholder — à compléter juridiquement)
// ============================================================

import Link from 'next/link'

export default function CguPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white/80">
      <h1 className="font-syne mb-6 text-3xl font-bold text-white">Conditions générales d&apos;utilisation</h1>
      <p className="mb-4 text-sm text-white/60">
        Version 1.0 — BLOCKTRUST (blocktrust.tech). Ce document est un canevas : faites-le valider par un
        conseil avant mise en production.
      </p>
      <p className="mb-8 text-sm">
        <Link href="/" className="text-[#00d4ff] hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  )
}
