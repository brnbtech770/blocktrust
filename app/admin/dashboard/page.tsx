// app/admin/dashboard/page.tsx
// Tableau de bord admin avec KPIs + revenus (estimation DB)
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import VerifyBadgeCard from '@/app/components/dashboard/VerifyBadgeCard'
import ChromeExtensionBanner from '@/app/components/dashboard/ChromeExtensionBanner'
import Link from 'next/link'
import {
  ADMIN_PLAN_PRICES_MONTHLY,
  getBillingPeriodFromStripePriceId,
  getYearlyStripePriceIdSet,
  monthlyRevenueForSubscription,
} from '@/lib/admin-revenue'
import { formatPriceFr } from '@/lib/pricing'
import { getPlanDisplayLabel } from '@/lib/plan-features'
import { getAdminAlertDailySummary } from '@/lib/alert-grace-period'
import { AlertTriangle, BadgeCheck, Euro, TrendingUp, Users } from 'lucide-react'
import { auth } from '@/app/lib/auth-server'
import { isSuperAdmin } from '@/app/lib/admin'
import AdminInternalTeamSection from '@/app/admin/dashboard/AdminInternalTeamSection'

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

type RevenueRow = {
  plan: string
  periodLabel: string
  clients: number
  unitLabel: string
  totalMrr: number
}

export default async function AdminDashboard() {
  await requireAdminPage()
  const session = await auth()
  const showInternalTeam = isSuperAdmin(session?.user?.email)

  const yearlyIds = getYearlyStripePriceIdSet()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    pendingCertificates,
    totalUsers,
    activeCertificates,
    revokedCertificates,
    activeSubscriptions,
    newUsersThisMonth,
    subsForRevenue,
    verificationsToday,
    alertsUnreadWeek,
    alertDailySummary,
  ] = await Promise.all([
    prisma.certificate
      .count({ where: { status: 'PENDING' } })
      .catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.certificate
      .count({ where: { status: { in: ['ACTIVE', 'ANCHORED'] } } })
      .catch(() => 0),
    prisma.certificate
      .count({ where: { status: 'REVOKED' } })
      .catch(() => 0),
    prisma.subscription
      .count({ where: { status: 'active' } })
      .catch(() => 0),
    prisma.user
      .count({ where: { createdAt: { gte: startOfMonth } } })
      .catch(() => 0),
    prisma.subscription
      .findMany({
        where: { status: 'active' },
        select: { plan: true, stripePriceId: true },
      })
      .catch(() => [] as { plan: string; stripePriceId: string | null }[]),
    prisma.verification
      .count({ where: { verifiedAt: { gte: startOfDay } } })
      .catch(() => 0),
    prisma.adminAlert
      .count({ where: { read: false, createdAt: { gte: weekAgo } } })
      .catch(() => 0),
    getAdminAlertDailySummary(),
  ])

  let mrrDb = 0
  const breakdown = new Map<string, { plan: string; period: 'MONTHLY' | 'YEARLY' | 'UNKNOWN'; count: number }>()

  for (const s of subsForRevenue) {
    mrrDb += monthlyRevenueForSubscription(s.plan, s.stripePriceId, yearlyIds)
    const p = getBillingPeriodFromStripePriceId(s.stripePriceId, yearlyIds)
    const k = `${s.plan}|${p}`
    const cur = breakdown.get(k) ?? { plan: s.plan, period: p, count: 0 }
    cur.count += 1
    breakdown.set(k, cur)
  }

  const arrDb = mrrDb * 12

  const revenueRows: RevenueRow[] = [...breakdown.values()]
    .map((row) => {
      const isEnterprisePlan = row.plan === 'ENTERPRISE' || row.plan === 'B2B_ENTERPRISE'
      const unit =
        row.period === 'YEARLY'
          ? ADMIN_PLAN_PRICES_MONTHLY[row.plan] * 0.8
          : ADMIN_PLAN_PRICES_MONTHLY[row.plan] ?? 0
      const totalMrr = row.count * unit
      return {
        plan: row.plan,
        periodLabel: row.period === 'YEARLY' ? 'Annuel (-20 %)' : row.period === 'MONTHLY' ? 'Mensuel' : '—',
        clients: row.count,
        unitLabel: isEnterprisePlan
          ? 'Sur devis'
          : row.period === 'UNKNOWN'
            ? '—'
            : `${formatPriceFr(unit)}€ MRR eq. / client`,
        totalMrr,
      }
    })
    .sort((a, b) => b.totalMrr - a.totalMrr)

  return (
    <div className="font-sans text-base leading-relaxed text-white/80">
      <p className="mb-4 text-sm text-white/60">Vue d&apos;ensemble de la plateforme</p>

      <ChromeExtensionBanner className="mb-8" />

      {alertDailySummary.graceSkipsToday > 0 ? (
        <div
          className="mb-6 rounded-xl border border-[#00d4ff]/25 bg-[#00d4ff]/10 px-4 py-3 text-sm text-white/80"
          role="status"
        >
          <span className="font-mono font-semibold text-[#00d4ff]">
            {alertDailySummary.alertsToday}
          </span>{' '}
          alerte{alertDailySummary.alertsToday !== 1 ? 's' : ''} aujourd&apos;hui —{' '}
          <span className="text-white/55">
            {alertDailySummary.graceSkipsToday} filtrée
            {alertDailySummary.graceSkipsToday !== 1 ? 's' : ''} (comptes neufs {'<'} 72 h en période
            de grâce)
          </span>
        </div>
      ) : null}

      {/* KPIs existants */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Demandes en attente"
          value={String(pendingCertificates)}
          accentClass="text-gold"
          topBar="var(--bt-gold)"
        />
        <KpiCard
          label="Abonnements actifs"
          value={String(activeSubscriptions)}
          accentClass="text-[var(--bt-success)]"
          topBar="var(--bt-success)"
        />
        <KpiCard
          label="MRR (estim. DB)"
          value={`${formatPriceFr(mrrDb)}€`}
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
          label="Badges actifs"
          value={String(activeCertificates)}
          accentClass="text-bt-cyan"
          topBar="var(--bt-cyan)"
        />
      </div>

      {/* Revenus */}
      <div className="mb-8 rounded-xl border border-white/10 bg-[#0d1f3c]/60 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#BDA76B]/25 bg-[#BDA76B]/10">
            <Euro className="h-5 w-5 text-[#BDA76B]" aria-hidden />
          </div>
          <div className="flex-1">
            <h2 className="font-syne text-lg font-semibold text-white">Revenus (abonnements DB)</h2>
            <p className="text-xs text-white/45">
              Estimation à partir du catalogue et des price IDs Stripe (mensuel vs annuel). Pas de lecture API
              Stripe sur ce chargement.
            </p>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-[#00d4ff]/20 bg-black/20 px-4 py-4">
            <p className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-white/45">
              <TrendingUp className="h-3.5 w-3.5 text-[#00d4ff]" aria-hidden />
              MRR total
            </p>
            <p className="font-mono text-2xl font-bold tabular-nums text-[#00d4ff]">
              {formatPriceFr(mrrDb)}€
            </p>
          </div>
          <div className="rounded-lg border border-[#BDA76B]/20 bg-black/20 px-4 py-4">
            <p className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-white/45">
              <TrendingUp className="h-3.5 w-3.5 text-[#BDA76B]" aria-hidden />
              ARR (MRR × 12)
            </p>
            <p className="font-mono text-2xl font-bold tabular-nums text-[#BDA76B]">
              {formatPriceFr(arrDb)}€
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/45">
              Abonnements actifs
            </p>
            <p className="font-mono text-2xl font-bold tabular-nums text-white">{activeSubscriptions}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-widest text-white/45">
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Clients</th>
                <th className="px-4 py-3 font-semibold">Prix</th>
                <th className="px-4 py-3 font-semibold">Mensuel / Annuel</th>
                <th className="px-4 py-3 font-semibold text-right">Total MRR</th>
              </tr>
            </thead>
            <tbody>
              {revenueRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-white/45">
                    Aucun abonnement actif.
                  </td>
                </tr>
              ) : (
                revenueRows.map((r) => (
                  <tr key={`${r.plan}-${r.periodLabel}`} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-xs text-white">{getPlanDisplayLabel(r.plan)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-white/85">{r.clients}</td>
                    <td className="px-4 py-3 text-xs text-white/70">{r.unitLabel}</td>
                    <td className="px-4 py-3 text-xs text-white/60">{r.periodLabel}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-[#00d4ff]">
                      {formatPriceFr(r.totalMrr)}€
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activité */}
      <div className="mb-8 rounded-xl border border-white/10 bg-[#0d1f3c]/60 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
            <BadgeCheck className="h-5 w-5 text-emerald-400" aria-hidden />
          </div>
          <h2 className="font-syne text-lg font-semibold text-white">Activité</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
            <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/45">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Utilisateurs actifs
            </p>
            <p className="font-mono text-xl font-bold text-white">{activeSubscriptions}</p>
            <p className="text-[10px] text-white/35">Abonnement Stripe actif</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/45">Nouveaux (mois)</p>
            <p className="font-mono text-xl font-bold text-[#00d4ff]">{newUsersThisMonth}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/45">Badges actifs</p>
            <p className="font-mono text-xl font-bold text-emerald-400">{activeCertificates}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/45">Badges révoqués</p>
            <p className="font-mono text-xl font-bold text-[#E05252]">{revokedCertificates}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
            <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/45">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden />
              Alertes non lues (7j)
            </p>
            <p className="font-mono text-xl font-bold text-amber-400">{alertsUnreadWeek}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 sm:col-span-2 lg:col-span-1">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/45">Vérifications (jour)</p>
            <p className="font-mono text-xl font-bold text-white">{verificationsToday}</p>
          </div>
        </div>
      </div>

      {showInternalTeam ? (
        <AdminInternalTeamSection />
      ) : null}

      {/* Actions rapides */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
        <h2 className="font-syne mb-4 text-xl font-semibold tracking-tight text-white">
          Actions rapides
        </h2>
        <div className="mb-6">
          <VerifyBadgeCard quotaLabel={null} isAdmin />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/clients"
            className="rounded-lg border border-bt-cyan/40 px-4 py-2 text-sm font-medium text-bt-cyan transition-all hover:border-bt-cyan/60 hover:bg-bt-cyan/10"
          >
            Vue clients
          </Link>
          <Link
            href="/admin/certificates?status=PENDING"
            className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-gold transition-all hover:border-gold/60 hover:bg-gold/10"
          >
            Voir les demandes en attente
          </Link>
          <Link
            href="/admin/users"
            className="rounded-lg border border-bt-cyan/40 px-4 py-2 text-sm font-medium text-bt-cyan transition-all hover:border-bt-cyan/60 hover:bg-bt-cyan/10"
          >
            Gérer les utilisateurs
          </Link>
          <Link
            href="/admin/ai-alerts"
            className="rounded-lg border border-red-400/40 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:border-red-400/60 hover:bg-red-500/10"
          >
            Voir les alertes
          </Link>
        </div>
      </div>
    </div>
  )
}
