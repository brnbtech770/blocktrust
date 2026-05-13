// app/admin/clients/page.tsx
// Vue clients orientée business (admin)
// ============================================================

import Link from 'next/link'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/lib/admin-utils'
import { redirect } from 'next/navigation'
import { formatPriceFr, PLANS_B2B, PLANS_B2C } from '@/lib/pricing'
import {
  getBillingPeriodFromStripePriceId,
  getYearlyStripePriceIdSet,
} from '@/lib/admin-revenue'
import { Users, CheckCircle2, Clock, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type ClientFilter = 'all' | 'active' | 'no-badge' | 'no-sub'

function filterParam(v: string | undefined): ClientFilter {
  if (v === 'active' || v === 'no-badge' || v === 'no-sub') return v
  return 'all'
}

type CatalogPlan = {
  id: string
  prices:
    | {
        monthly: { amount: number }
        yearly?: { amount: number } | null
      }
    | null
}

function catalogPlanByCode(code: string): CatalogPlan | undefined {
  const b2c = [...PLANS_B2C] as unknown as CatalogPlan[]
  const b2b = [...PLANS_B2B] as unknown as CatalogPlan[]
  return b2c.find((p) => p.id === code) ?? b2b.find((p) => p.id === code)
}

function formatPlanBillingLabel(planCode: string, isYearly: boolean): string {
  if (planCode === 'ENTERPRISE') return 'Sur devis'
  const p = catalogPlanByCode(planCode)
  if (!p?.prices) return '—'
  if (isYearly && p.prices.yearly && typeof p.prices.yearly.amount === 'number') {
    return `${formatPriceFr(p.prices.yearly.amount)}€/an`
  }
  if (p.prices.monthly) {
    return `${formatPriceFr(p.prices.monthly.amount)}€/mois`
  }
  return '—'
}

type FlatCert = {
  status: string
  blockchainStatus: string
  polygonTxHash: string | null
  txHash: string | null
  issuedAt: Date
}

function flattenCerts(
  entities: {
    certificates: {
      status: string
      blockchainStatus: string
      polygonTxHash: string | null
      txHash: string | null
      issuedAt: Date
    }[]
  }[],
): FlatCert[] {
  return entities.flatMap((e) => e.certificates)
}

function pickLatestCert(entities: Parameters<typeof flattenCerts>[0]): FlatCert | null {
  const all = flattenCerts(entities)
  if (!all.length) return null
  return [...all].sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())[0] ?? null
}

function badgeUi(cert: FlatCert | null): {
  label: string
  className: string
} {
  if (!cert) {
    return { label: 'AUCUN', className: 'bg-white/10 text-white/55 border-white/15' }
  }
  const s = cert.status
  if (s === 'ACTIVE' || s === 'ANCHORED') {
    return { label: 'ACTIF', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35' }
  }
  if (s === 'REVOKED') {
    return { label: 'RÉVOQUÉ', className: 'bg-[#E05252]/15 text-[#E05252] border-[#E05252]/35' }
  }
  if (s === 'PENDING' || s === 'SUSPENDED' || s === 'EXPIRED') {
    return { label: 'EN DEMANDE', className: 'bg-amber-500/15 text-amber-400 border-amber-500/35' }
  }
  return { label: 'AUCUN', className: 'bg-white/10 text-white/55 border-white/15' }
}

function hasActiveBadge(cert: FlatCert | null): boolean {
  if (!cert) return false
  return cert.status === 'ACTIVE' || cert.status === 'ANCHORED'
}

function anchorUi(
  cert: FlatCert | null,
): { label: string; Icon: typeof CheckCircle2; className: string } {
  if (!cert) {
    return { label: 'Non', Icon: XCircle, className: 'text-white/40' }
  }
  const bs = cert.blockchainStatus
  const anchored = bs === 'ANCHORED' || Boolean(cert.polygonTxHash || cert.txHash)
  if (anchored) {
    return { label: 'Ancré', Icon: CheckCircle2, className: 'text-emerald-400' }
  }
  if (bs === 'FAILED') {
    return { label: 'Échec', Icon: XCircle, className: 'text-[#E05252]' }
  }
  return { label: 'En attente', Icon: Clock, className: 'text-amber-400' }
}

function kycLabel(status: string): { text: string; className: string } {
  if (status === 'VERIFIED') return { text: 'Vérifié', className: 'text-emerald-400' }
  if (status === 'REJECTED') return { text: 'Rejeté', className: 'text-[#E05252]' }
  return { text: 'En attente', className: 'text-amber-400' }
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/dashboard')
  }

  const { filter: filterRaw } = await searchParams
  const filter = filterParam(filterRaw)

  const yearlyIds = getYearlyStripePriceIdSet()

  const clientsRaw = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      trustScore: true,
      createdAt: true,
      kycStatus: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          stripePriceId: true,
          currentPeriodEnd: true,
        },
      },
      entities: {
        select: {
          certificates: {
            orderBy: { issuedAt: 'desc' },
            take: 8,
            select: {
              id: true,
              publicId: true,
              status: true,
              blockchainStatus: true,
              polygonTxHash: true,
              txHash: true,
              issuedAt: true,
            },
          },
        },
      },
    },
  })

  const rows = clientsRaw
    .map((u) => {
      const cert = pickLatestCert(u.entities)
      const subActive = u.subscription?.status === 'active'
      const period = getBillingPeriodFromStripePriceId(u.subscription?.stripePriceId ?? null, yearlyIds)
      const isYearly = period === 'YEARLY'
      const planCode = u.subscription?.plan ?? '—'
      const billingLabel =
        planCode !== '—' && u.subscription
          ? formatPlanBillingLabel(planCode, isYearly)
          : '—'

      return {
        user: u,
        cert,
        subActive,
        billingLabel,
        planCode,
        periodLabel: period === 'YEARLY' ? 'Annuel' : period === 'MONTHLY' ? 'Mensuel' : '—',
      }
    })
    .filter((r) => {
      if (filter === 'active') return r.subActive
      if (filter === 'no-sub') return !r.subActive
      if (filter === 'no-badge') return !hasActiveBadge(r.cert)
      return true
    })

  const filterLinkClass = (f: ClientFilter) =>
    [
      'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
      filter === f
        ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40'
        : 'text-white/50 border border-transparent hover:text-white hover:bg-white/5',
    ].join(' ')

  return (
    <div className="font-sans text-white/85">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#00d4ff]/25 bg-[#00d4ff]/10">
            <Users className="h-5 w-5 text-[#00d4ff]" aria-hidden />
          </div>
          <div>
            <h1 className="font-syne text-xl font-bold text-white sm:text-2xl">Vue clients</h1>
            <p className="text-sm text-white/50">
              {rows.length} client{rows.length > 1 ? 's' : ''}
              {filter !== 'all' ? ' (filtre affiché)' : ''} · total base : {clientsRaw.length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/clients" className={filterLinkClass('all')}>
            Tous
          </Link>
          <Link href="/admin/clients?filter=active" className={filterLinkClass('active')}>
            Actifs
          </Link>
          <Link href="/admin/clients?filter=no-badge" className={filterLinkClass('no-badge')}>
            Sans badge
          </Link>
          <Link href="/admin/clients?filter=no-sub" className={filterLinkClass('no-sub')}>
            Sans abonnement
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1f3c]/80">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/45">
              <th className="sticky left-0 z-10 bg-[#0d1f3c] px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Badge</th>
              <th className="px-4 py-3 font-semibold">Ancrage</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Facturation</th>
              <th className="px-4 py-3 font-semibold">KYC</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Inscrit</th>
              <th className="sticky right-0 z-10 bg-[#0d1f3c] px-4 py-3 font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user: u, cert, billingLabel, planCode, periodLabel }) => {
              const b = badgeUi(cert)
              const a = anchorUi(cert)
              const k = kycLabel(u.kycStatus)
              const displayName = u.name?.trim() || u.email?.split('@')[0] || '—'
              const initials = (() => {
                if (u.name?.trim()) {
                  const parts = u.name.trim().split(/\s+/)
                  const fi = parts[0]?.[0] ?? ''
                  const li = parts[1]?.[0] ?? ''
                  return (fi + li).toUpperCase() || fi.toUpperCase()
                }
                return (u.email?.[0] ?? '?').toUpperCase()
              })()

              const AIcon = a.Icon

              return (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="sticky left-0 z-[1] bg-[#0d1f3c] px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <img
                          src={u.image}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#00d4ff]/25 text-xs font-bold text-[#00d4ff]"
                          aria-hidden
                        >
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{displayName}</p>
                        <p className="truncate font-mono text-xs text-white/45">{u.email ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${b.className}`}
                    >
                      {b.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${a.className}`}>
                      <AIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {a.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/90">{planCode}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-white/90">{billingLabel}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/35">{periodLabel}</p>
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${k.className}`}>{k.text}</td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-white/80">
                    {u.trustScore ?? 0}
                    <span className="text-white/35">/100</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/55">
                    {u.createdAt.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="sticky right-0 z-[1] bg-[#0d1f3c] px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="inline-flex rounded-lg border border-[#00d4ff]/35 bg-[#00d4ff]/10 px-3 py-1.5 text-xs font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/20"
                    >
                      Gérer
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/45">Aucun client pour ce filtre.</p>
        ) : null}
      </div>
    </div>
  )
}
