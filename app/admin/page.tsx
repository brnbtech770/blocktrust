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
    <div className="font-sans">
      <p className="mb-8 text-sm" style={{ color: 'var(--bt-muted)' }}>Vue d'ensemble de la plateforme</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="p-6 rounded-xl border relative overflow-hidden" style={{ background: 'rgba(13,31,60,0.8)', borderColor: 'var(--bt-border)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--bt-gold)' }} />
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Demandes en attente</p>
          <p className="text-[28px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--bt-gold)' }}>{pendingCertificates}</p>
        </div>
        <div className="p-6 rounded-xl border relative overflow-hidden" style={{ background: 'rgba(13,31,60,0.8)', borderColor: 'var(--bt-border)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--bt-success)' }} />
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Utilisateurs actifs</p>
          <p className="text-[28px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif', color: '#1DB87E' }}>{activeUsers}</p>
        </div>
        <div className="p-6 rounded-xl border relative overflow-hidden" style={{ background: 'rgba(13,31,60,0.8)', borderColor: 'var(--bt-border)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--bt-cyan)' }} />
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Revenus MRR</p>
          <p className="text-[28px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--bt-cyan)' }}>{mrr.toFixed(2)}€</p>
        </div>
        <div className="p-6 rounded-xl border relative overflow-hidden" style={{ background: 'rgba(13,31,60,0.8)', borderColor: 'var(--bt-border)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--bt-cyan)' }} />
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Total utilisateurs</p>
          <p className="text-[28px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--bt-cyan)' }}>{totalUsers}</p>
        </div>
        <div className="p-6 rounded-xl border relative overflow-hidden" style={{ background: 'rgba(13,31,60,0.8)', borderColor: 'var(--bt-border)' }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'var(--bt-cyan)' }} />
          <p className="text-[10px] font-medium mb-2 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Certificats actifs</p>
          <p className="text-[28px] font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--bt-cyan)' }}>{activeCertificates}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="rounded-xl border p-6" style={{ background: 'rgba(13,31,60,0.8)', borderColor: 'var(--bt-border)' }}>
        <h2 className="text-xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/certificates?status=PENDING"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' }}
          >
            Voir les demandes en attente
          </a>
          <a
            href="/admin/users"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}
          >
            Gérer les utilisateurs
          </a>
          <a
            href="/admin/alerts"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' }}
          >
            Voir les alertes
          </a>
        </div>
      </div>
    </div>
  )
}
