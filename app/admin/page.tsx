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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Tableau de bord Admin</h1>
        <p className="text-gray-400 text-sm">Vue d'ensemble de la plateforme</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
          <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Demandes en attente</p>
          <p className="text-4xl font-bold text-yellow-400 tracking-tight">{pendingCertificates}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
          <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Utilisateurs actifs</p>
          <p className="text-4xl font-bold text-green-400 tracking-tight">{activeUsers}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
          <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Revenus MRR</p>
          <p className="text-4xl font-bold text-purple-400 tracking-tight">{mrr.toFixed(2)}€</p>
        </div>
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
          <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Total utilisateurs</p>
          <p className="text-4xl font-bold text-cyan-400 tracking-tight">{totalUsers}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
          <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Certificats actifs</p>
          <p className="text-4xl font-bold text-blue-400 tracking-tight">{activeCertificates}</p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Actions rapides</h2>
        <div className="flex gap-3">
          <a
            href="/admin/certificates?status=PENDING"
            className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-500/30 transition text-sm font-medium"
          >
            Voir les demandes en attente
          </a>
          <a
            href="/admin/users"
            className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition text-sm font-medium"
          >
            Gérer les utilisateurs
          </a>
          <a
            href="/admin/alerts"
            className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition text-sm font-medium"
          >
            Voir les alertes
          </a>
        </div>
      </div>
    </div>
  )
}
