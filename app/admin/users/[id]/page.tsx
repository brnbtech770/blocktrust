// app/admin/users/[id]/page.tsx
// Détail d'un utilisateur pour admin
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import { notFound } from 'next/navigation'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { adminUserDetailSelect } from '@/lib/prisma-admin-user'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: adminUserDetailSelect,
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

  const cardCls =
    'rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30'
  const labelStyle = { color: 'var(--bt-muted)' }

  return (
    <div>
      <div className="mb-8">
        <a href="/admin/users" className="mb-4 inline-block hover:underline" style={{ color: 'var(--bt-cyan)' }}>
          ← Retour à la liste
        </a>
        <p style={{ color: 'var(--bt-muted)' }}>Email: {user.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className={cardCls}>
          <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Informations profil</h2>
          <div className="space-y-3">
            <div><p className="text-sm" style={labelStyle}>Nom</p><p className="text-white">{user.name || '—'}</p></div>
            <div><p className="text-sm" style={labelStyle}>Email</p><p className="text-white">{user.email}</p></div>
            <div><p className="text-sm" style={labelStyle}>Date d'inscription</p><p className="text-white">{new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
            <div><p className="text-sm" style={labelStyle}>Stripe Customer ID</p><p className="text-white text-sm font-mono">{user.stripeCustomerId || '—'}</p></div>
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Plan actuel</h2>
          <div className="space-y-3">
            {user.plan ? (
              <>
                <div><p className="text-sm" style={labelStyle}>Plan</p><p className="text-white font-bold">{user.plan.name}</p><p className="text-xs" style={labelStyle}>{user.plan.type}</p></div>
                <div><p className="text-sm" style={labelStyle}>Prix</p><p className="text-white">{user.plan.price.toNumber()}€ / {user.plan.interval === 'MONTHLY' ? 'mois' : 'an'}</p></div>
                {subscription && (
                  <div>
                    <p className="text-sm" style={labelStyle}>Statut Stripe</p>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={subscription.status === 'active' ? { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' } : { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }}>
                      {subscription.status}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p style={labelStyle}>Aucun plan actif</p>
            )}
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Usage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-sm" style={labelStyle}>Entités</p><p className="text-2xl font-bold text-white">{user.entities.length}{user.plan && ` / ${user.plan.maxEntities}`}</p></div>
          <div><p className="text-sm" style={labelStyle}>Certificats</p><p className="text-2xl font-bold text-white">{totalCertificates}{user.plan && ` / ${user.plan.maxCertificates}`}</p></div>
          <div><p className="text-sm" style={labelStyle}>Vérifications totales</p><p className="text-2xl font-bold text-white">{user.entities.reduce((sum, entity) => sum + entity.certificates.reduce((certSum, cert) => certSum + (cert.verificationCount || 0), 0), 0)}</p></div>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Entités et certificats</h2>
        {user.entities.length > 0 ? (
          <div className="space-y-4">
            {user.entities.map((entity) => (
              <div
                key={entity.id}
                className="rounded-lg p-4 border"
                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--bt-border)' }}
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
                    <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>{entity.email}</p>
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
                    <p className="text-xs" style={{ color: 'var(--bt-muted)' }}>TrustScore</p>
                    <p className="text-white">
                      {entity.trustScore.score}/100 ({entity.trustScore.level})
                    </p>
                  </div>
                )}
                <div className="mt-2">
                  <p className="text-xs" style={{ color: 'var(--bt-muted)' }}>Certificats: {entity.certificates.length}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--bt-muted)' }}>Aucune entité créée</p>
        )}
      </div>

      {/* Factures Stripe */}
      {invoices.length > 0 && (
        <div className={cardCls}>
          <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Factures Stripe</h2>
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="rounded-lg p-4 border flex justify-between items-center"
                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--bt-border)' }}
              >
                <div>
                  <p className="text-white font-medium">
                    {new Date(invoice.created * 1000).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
                    {invoice.amount_paid / 100}€ - {invoice.status}
                  </p>
                </div>
                <a
                  href={invoice.hosted_invoice_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: 'var(--bt-cyan)' }}
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
