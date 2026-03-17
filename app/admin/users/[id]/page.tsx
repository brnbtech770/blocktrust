// app/admin/users/[id]/page.tsx
// Détail d'un utilisateur pour admin
// ============================================================

import { prisma } from '@/app/lib/db'
import { notFound } from 'next/navigation'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
})

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      plan: true,
      entities: {
        include: {
          certificates: true,
          trustScore: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  // Récupérer les factures Stripe si stripeCustomerId existe
  let invoices: Stripe.Invoice[] = []
  let subscription: Stripe.Subscription | null = null

  if (user.stripeCustomerId) {
    try {
      const [invoicesData, subscriptionsData] = await Promise.all([
        stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 10,
        }),
        stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'all',
          limit: 1,
        }),
      ])

      invoices = invoicesData.data
      subscription = subscriptionsData.data[0] || null
    } catch (error) {
      console.error('❌ Erreur récupération Stripe:', error)
    }
  }

  const totalCertificates = user.entities.reduce(
    (sum, entity) => sum + entity.certificates.length,
    0
  )

  return (
    <div>
      <div className="mb-8">
        <a
          href="/admin/users"
          className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
        >
          ← Retour à la liste
        </a>
        <h1 className="text-3xl font-bold text-white">Détail utilisateur</h1>
        <p className="text-gray-400">Email: {user.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Informations profil */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Informations profil</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Nom</p>
              <p className="text-white">{user.name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Date d'inscription</p>
              <p className="text-white">
                {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Stripe Customer ID</p>
              <p className="text-white font-mono text-sm">
                {user.stripeCustomerId || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Plan actuel */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Plan actuel</h2>
          <div className="space-y-3">
            {user.plan ? (
              <>
                <div>
                  <p className="text-gray-400 text-sm">Plan</p>
                  <p className="text-white font-bold">{user.plan.name}</p>
                  <p className="text-gray-500 text-xs">{user.plan.type}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Prix</p>
                  <p className="text-white">
                    {user.plan.price.toNumber()}€ / {user.plan.interval === 'MONTHLY' ? 'mois' : 'an'}
                  </p>
                </div>
                {subscription && (
                  <div>
                    <p className="text-gray-400 text-sm">Statut Stripe</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      subscription.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {subscription.status}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-400">Aucun plan actif</p>
            )}
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Usage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Entités</p>
            <p className="text-2xl font-bold text-white">
              {user.entities.length}
              {user.plan && ` / ${user.plan.maxEntities}`}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Certificats</p>
            <p className="text-2xl font-bold text-white">
              {totalCertificates}
              {user.plan && ` / ${user.plan.maxCertificates}`}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Vérifications totales</p>
            <p className="text-2xl font-bold text-white">
              {user.entities.reduce(
                (sum, entity) =>
                  sum +
                  entity.certificates.reduce(
                    (certSum, cert) => certSum + (cert.verificationCount || 0),
                    0
                  ),
                0
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Entités et certificats */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Entités et certificats</h2>
        {user.entities.length > 0 ? (
          <div className="space-y-4">
            {user.entities.map((entity) => (
              <div
                key={entity.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-medium">
                      {entity.legalName ||
                        (entity.firstName && entity.lastName
                          ? `${entity.firstName} ${entity.lastName}`
                          : entity.tradeName ||
                            entity.email ||
                            'Sans nom')}
                    </p>
                    <p className="text-gray-400 text-sm">{entity.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    entity.entityType === 'INDIVIDUAL'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {entity.entityType === 'INDIVIDUAL' ? 'B2C' : 'B2B'}
                  </span>
                </div>
                {entity.trustScore && (
                  <div className="mt-2">
                    <p className="text-gray-400 text-xs">TrustScore</p>
                    <p className="text-white">
                      {entity.trustScore.score}/100 ({entity.trustScore.level})
                    </p>
                  </div>
                )}
                <div className="mt-2">
                  <p className="text-gray-400 text-xs">Certificats: {entity.certificates.length}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">Aucune entité créée</p>
        )}
      </div>

      {/* Factures Stripe */}
      {invoices.length > 0 && (
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Factures Stripe</h2>
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex justify-between items-center"
              >
                <div>
                  <p className="text-white font-medium">
                    {new Date(invoice.created * 1000).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {invoice.amount_paid / 100}€ - {invoice.status}
                  </p>
                </div>
                <a
                  href={invoice.hosted_invoice_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  Voir facture →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
