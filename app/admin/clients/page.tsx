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
import { Users } from 'lucide-react'
import AdminClientsTable, { type AdminClientRow } from '@/app/admin/clients/AdminClientsTable'

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

function badgeUi(cert: FlatCert | null): { label: string; className: string } {
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

function anchorUi(cert: FlatCert | null): {
  label: string
  className: string
  icon: AdminClientRow['anchorIcon']
} {
  if (!cert) {
    return { label: 'Non', className: 'text-white/40', icon: 'x' }
  }
  const bs = cert.blockchainStatus
  const anchored = bs === 'ANCHORED' || Boolean(cert.polygonTxHash || cert.txHash)
  if (anchored) {
    return { label: 'Ancré', className: 'text-emerald-400', icon: 'check' }
  }
  if (bs === 'FAILED') {
    return { label: 'Échec', className: 'text-[#E05252]', icon: 'x' }
  }
  return { label: 'En attente', className: 'text-amber-400', icon: 'clock' }
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
        },
      },
      entities: {
        select: {
          certificates: {
            where: {
              status: { in: ['ACTIVE', 'ANCHORED'] },
            },
            take: 1,
            orderBy: { issuedAt: 'desc' },
            select: {
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

  const rows: AdminClientRow[] = clientsRaw
    .map((u) => {
      const cert = pickLatestCert(u.entities)
      const subActive = u.subscription?.status === 'active'
      const period = getBillingPeriodFromStripePriceId(u.subscription?.stripePriceId ?? null, yearlyIds)
      const isYearly = period === 'YEARLY'
      const planCode = u.subscription?.plan ?? '—'
      const billingLabel =
        planCode !== '—' && u.subscription ? formatPlanBillingLabel(planCode, isYearly) : '—'
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

      return {
        id: u.id,
        name: displayName,
        email: u.email ?? '—',
        image: u.image,
        initials,
        badgeLabel: b.label,
        badgeClassName: b.className,
        anchorLabel: a.label,
        anchorClassName: a.className,
        anchorIcon: a.icon,
        planCode,
        billingLabel,
        periodLabel: period === 'YEARLY' ? 'Annuel' : period === 'MONTHLY' ? 'Mensuel' : '—',
        kycText: k.text,
        kycClassName: k.className,
        trustScore: u.trustScore ?? 0,
        createdAtLabel: u.createdAt.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        subActive,
        hasActiveBadge: hasActiveBadge(cert),
      }
    })
    .filter((r) => {
      if (filter === 'active') return r.subActive
      if (filter === 'no-sub') return !r.subActive
      if (filter === 'no-badge') return !r.hasActiveBadge
      return true
    })
    .map(({ subActive: _s, hasActiveBadge: _h, ...row }) => row)

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

      <AdminClientsTable rows={rows} />
    </div>
  )
}
