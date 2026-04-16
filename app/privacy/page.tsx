// Politique de confidentialité et cookies (placeholder — à compléter juridiquement)
// ============================================================

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white/80">
      <h1 className="font-syne mb-6 text-3xl font-bold text-white">
        Politique de confidentialité &amp; cookies
      </h1>
      <p className="mb-4 text-sm text-white/60">
        Décrit les traitements de données, les cookies nécessaires et analytiques anonymes, et vos droits
        (RGPD). Ce contenu est un canevas à faire valider juridiquement.
      </p>
      <p className="mb-8 text-sm">
        <Link href="/" className="text-[#00d4ff] hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  )
}
