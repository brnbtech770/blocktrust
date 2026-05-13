// app/admin/layout.tsx
// Layout pour le dashboard admin
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { hasAuthJsSessionCookie } from '@/app/lib/session-cookie-hints'
import { isRscPrefetchRequest } from '@/app/lib/is-rsc-prefetch-request'
import { redirect } from 'next/navigation'
import SignOutButton from '@/app/components/SignOutButton'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'
import Link from 'next/link'
import AdminPageHeader from '@/app/admin/AdminPageHeader'
import { prisma } from '@/app/lib/db'
import type { Metadata } from 'next'
import { Users, Building2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function IconDemandes() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconClients() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 14c0-3 10-3 10 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M14 14c0-2 2-2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconAlertes() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconKyc() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <path d="M8 10a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 14c0-3.5 2.5-6 6-6s6 2.5 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconSurveillance() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 2v2M8 12v2M2 8h2M12 8h2M4 4l1.5 1.5M10.5 10.5L12 12M12 4l-1.5 1.5M4 12l1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}

function IconTeam() {
  return <Users className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
}

function IconOrgGlobal() {
  return <Building2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
}

const navLinks = [
  { href: '/dashboard', label: 'Vue client', Icon: IconClients },
  { href: '/admin/dashboard', label: 'Tableau de bord', Icon: IconDashboard },
  { href: '/admin/organizations', label: 'Organisations B2B', Icon: IconOrgGlobal },
  { href: '/admin/certificates', label: 'Certificats', Icon: IconDemandes },
  { href: '/admin/kyc', label: 'KYC', Icon: IconKyc },
  { href: '/admin/demandes', label: 'Demandes Trust', Icon: IconDemandes },
  { href: '/admin/users', label: 'Clients', Icon: IconClients },
  { href: '/admin/alerts', label: 'Alertes', Icon: IconAlertes },
  { href: '/admin/ai-alerts', label: 'Alertes IA', Icon: IconAlertes },
  { href: '/admin/surveillance', label: 'Surveillance IA', Icon: IconSurveillance },
  { href: '/admin/team', label: 'Équipe', Icon: IconTeam },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.email) {
    if (await isRscPrefetchRequest()) {
      return (
        <div
          className="flex min-h-screen items-center justify-center font-sans"
          style={{ background: 'var(--bt-navy)' }}
          aria-busy="true"
          aria-label="Préchargement"
        >
          <div className="sr-only">Préchargement admin…</div>
        </div>
      )
    }
    const cookiePresent = await hasAuthJsSessionCookie()
    const reason = cookiePresent ? 'jwt-cookie-unreadable' : 'no-session-cookie'
    redirect(
      `/auth/signin?callbackUrl=${encodeURIComponent('/admin/dashboard')}&reason=${reason}`
    )
  }

  if (!isAdmin(session.user.email)) {
    redirect('/dashboard')
  }

  const unreadAdminAlerts = await prisma.adminAlert.count({
    where: { read: false },
  })

  return (
    <div
      className="flex h-screen overflow-hidden overflow-x-hidden font-sans"
      style={{ background: 'var(--bt-navy)' }}
    >
      {/* Sidebar fixe */}
      <aside
        className="flex w-[min(220px,85vw)] min-w-0 flex-shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r md:w-[220px]"
        style={{
          height: '100vh',
          background: 'rgba(6,14,26,0.9)',
          borderRightColor: 'var(--bt-border)',
        }}
      >
        {/* Bloc logo + badge ADMIN (stacked) */}
        <div
          className="flex flex-shrink-0 flex-col items-center gap-2 border-b px-4 py-3"
          style={{ borderBottomColor: 'var(--bt-border)' }}
        >
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5"
            style={{ textDecoration: 'none' }}
            aria-label="Retour au tableau de bord admin BLOCKTRUST"
          >
            <BlockTrustBadge size={36} instanceId="admin-header" showWatermark={false} className="shrink-0" />
            <span className="font-syne text-base font-bold leading-none tracking-wider text-bt-cyan">
              BLOCKTRUST
            </span>
          </Link>
          <span className="mx-auto w-fit rounded border border-bt-cyan/30 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-bt-cyan">
            ADMIN
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navLinks.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
              style={{ color: 'var(--bt-muted)' }}
            >
              <span className="inline-flex shrink-0 transition-all duration-300 group-hover:drop-shadow-[0_0_6px_rgba(0,212,255,0.8)]">
                <Icon />
              </span>
              <span className="flex-1">{label}</span>
              {href === '/admin/alerts' && unreadAdminAlerts > 0 ? (
                <span
                  className="min-w-[1.35rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold text-white"
                  style={{ background: '#dc2626' }}
                >
                  {unreadAdminAlerts > 99 ? '99+' : unreadAdminAlerts}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        {/* User pill en bas */}
        <div className="flex-shrink-0 space-y-2 border-t p-4" style={{ borderTopColor: 'var(--bt-border)' }}>
          <div
            className="flex items-center gap-3 rounded-lg border p-3"
            style={{ background: 'rgba(13,31,60,0.6)', borderColor: 'var(--bt-border)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: 'var(--bt-cyan)' }}
            >
              A
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">Admin</p>
              <p className="truncate text-xs" style={{ color: 'var(--bt-muted)' }}>{session.user.email}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Zone contenu */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminPageHeader />
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  )
}
