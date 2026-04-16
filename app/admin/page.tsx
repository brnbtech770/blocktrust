// app/admin/page.tsx
// Tableau de bord admin avec KPIs
// ============================================================

import { prisma } from '@/app/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

async function calculateMRR(): Promise<number> {
  try {
    // Récupérer toutes les subscriptions actives
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    })

    let mrr = 0

    for (const subscription of subscriptions.data) {
      const priceId = subscription.items.data[0]?.price.id
      if (!priceId) continue

      const price = await stripe.prices.retrieve(priceId)

      if (price.recurring?.interval === 'month') {
        // Abonnement mensuel
        mrr += price.unit_amount! / 100 // Convertir centimes en euros
      } else if (price.recurring?.interval === 'year') {
        // Abonnement annuel → diviser par 12 pour avoir le MRR
        mrr += (price.unit_amount! / 100) / 12
      }
    }

    return Math.round(mrr * 100) / 100 // Arrondir à 2 décimales
  } catch (error) {
    console.error('❌ Erreur calcul MRR:', error)
    return 0
  }
}

function KpiCard({
  label,
  value,
  accentClass,
  topBar,
}: {
  label: string
  value: string
  accentClass: string
  topBar: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
      <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: topBar }} />
      <p className="mb-2 font-sans text-[10px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className={`font-mono text-3xl font-bold tabular-nums tracking-tight ${accentClass}`}>
        {value}
      </p>
    </div>
  )
}

export default async function AdminDashboard() {
  // KPIs
  const [
    pendingCertificates,
    activeUsers,
    totalUsers,
    activeCertificates,
    mrr,
  ] = await Promise.all([
    prisma.certificate.count({
      where: { status: 'PENDING' },
    }),
    prisma.user.count({
      where: {
        planId: { not: null },
      },
    }),
    prisma.user.count(),
    prisma.certificate.count({
      where: { status: 'ACTIVE' },
    }),
    calculateMRR(),
  ])

  return (
    <div className="font-sans text-base leading-relaxed text-white/80">
      <p className="mb-8 text-sm text-white/60">Vue d&apos;ensemble de la plateforme</p>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Demandes en attente"
          value={String(pendingCertificates)}
          accentClass="text-gold"
          topBar="var(--bt-gold)"
        />
        <KpiCard
          label="Utilisateurs actifs"
          value={String(activeUsers)}
          accentClass="text-[var(--bt-success)]"
          topBar="var(--bt-success)"
        />
        <KpiCard
          label="Revenus MRR"
          value={`${mrr.toFixed(2)}€`}
          accentClass="text-bt-cyan"
          topBar="var(--bt-cyan)"
        />
        <KpiCard
          label="Total utilisateurs"
          value={String(totalUsers)}
          accentClass="text-bt-cyan"
          topBar="var(--bt-cyan)"
        />
        <KpiCard
          label="Certificats actifs"
          value={String(activeCertificates)}
          accentClass="text-bt-cyan"
          topBar="var(--bt-cyan)"
        />
      </div>

      {/* Actions rapides */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
        <h2 className="font-syne mb-4 text-xl font-semibold tracking-tight text-white">
          Actions rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/certificates?status=PENDING"
            className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-all hover:border-gold/60 hover:bg-gold/10"
          >
            Voir les demandes en attente
          </a>
          <a
            href="/admin/users"
            className="rounded-lg border border-bt-cyan/40 px-4 py-2 text-sm font-medium text-bt-cyan transition-all hover:border-bt-cyan/60 hover:bg-bt-cyan/10"
          >
            Gérer les utilisateurs
          </a>
          <a
            href="/admin/alerts"
            className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:border-red-400/60 hover:bg-red-500/10"
          >
            Voir les alertes
          </a>
        </div>
      </div>
    </div>
  )
}
