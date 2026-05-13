// app/dashboard/white-label/page.tsx
// Page dashboard "Marque Blanche & API" — Business & Enterprise
// ============================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { userHasWhiteLabelAccess } from '@/lib/whitelabel-access'
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

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { plan: true, status: true },
  })

  const canAccess = userHasWhiteLabelAccess({
    subscriptionPlan: subscription?.plan,
    subscriptionStatus: subscription?.status,
    userPlanType: user.plan?.type,
  })

  if (!canAccess) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#BDA76B]/20 bg-[#BDA76B]/10"
          aria-hidden
        >
          <Lock className="h-8 w-8 text-[#BDA76B]" strokeWidth={2} />
        </div>
        <h2 className="font-syne mb-2 text-xl font-bold text-white">White Label — Plan Business requis</h2>
        <p className="mb-6 max-w-md text-sm leading-relaxed text-white/50">
          La marque blanche est disponible à partir du plan Business. Vous pouvez également nous contacter pour une
          offre sur devis sur votre plan actuel.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/pricing?tab=entreprises"
            className="rounded-xl border border-[#BDA76B]/40 bg-[#BDA76B]/20 px-5 py-2.5 text-sm font-semibold text-[#BDA76B] transition hover:bg-[#BDA76B]/30"
          >
            Voir les plans
          </Link>
          <a
            href="mailto:commercial@blocktrust.tech"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/10"
          >
            Demande sur devis
          </a>
        </div>
      </div>
    )
  }

  return <WhiteLabelClient />
}
