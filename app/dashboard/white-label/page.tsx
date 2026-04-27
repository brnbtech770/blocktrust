// app/dashboard/white-label/page.tsx
// Page dashboard "Marque Blanche & API" — accessible aux plans White Label uniquement.
// ============================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Code2, Lock, ArrowRight } from 'lucide-react'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import WhiteLabelClient from './WhiteLabelClient'

export const metadata: Metadata = {
  title: 'Marque Blanche & API — BLOCKTRUST',
  description: 'Configurez votre clé API, vos couleurs de marque et vos webhooks.',
}

export const dynamic = 'force-dynamic'

export default async function WhiteLabelPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/dashboard/white-label')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { plan: true },
  })
  if (!user) redirect('/auth/signin')

  const enabled = Boolean(user.plan?.whitelabelEnabled)

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 flex items-center gap-3">
          <Code2 className="h-7 w-7 text-bt-cyan" />
          <h1 className="font-syne text-2xl font-bold text-white sm:text-3xl">
            Marque Blanche & API
          </h1>
        </div>
        <div
          className="rounded-2xl border p-8"
          style={{
            background: 'rgba(189,167,107,0.06)',
            borderColor: 'rgba(189,167,107,0.4)',
          }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-bt-gold/40 bg-bt-gold/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-bt-gold">
            <Lock className="h-3.5 w-3.5" />
            Plan B2B requis
          </div>
          <h2 className="font-syne text-xl font-bold text-white">
            Débloquez la marque blanche & l&apos;API publique
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            La marque blanche, l&apos;API de vérification publique, le widget embeddable
            et les webhooks sortants sont disponibles sur les plans entreprise BLOCKTRUST
            (Starter, Team, Business, Enterprise).
          </p>
          <ul className="mt-5 space-y-2 text-sm text-white/75">
            <li>• Clé API privée signée + rate-limit 30 req/min</li>
            <li>• Widget badge personnalisable aux couleurs de votre marque</li>
            <li>• Webhooks signés HMAC-SHA256 sur les événements de vérification</li>
            <li>• Quota d&apos;appels mensuel selon votre forfait</li>
          </ul>
          <Link
            href="/pricing?tab=entreprises"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-bt-cyan px-5 py-2.5 font-medium text-bt-navy transition-all hover:bg-bt-cyan/90"
          >
            Voir les forfaits entreprise
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return <WhiteLabelClient />
}
