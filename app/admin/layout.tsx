// app/admin/layout.tsx
// Layout pour le dashboard admin
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { hasAuthJsSessionCookie } from '@/app/lib/session-cookie-hints'
import { isRscPrefetchRequest } from '@/app/lib/is-rsc-prefetch-request'
import { redirect } from 'next/navigation'
import SignOutButton from '@/app/components/SignOutButton'
import { Logo } from '@/app/components/ui/Logo'
import Link from 'next/link'
import AdminPageHeader from '@/app/admin/AdminPageHeader'
import { prisma } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

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

const navLinks = [
  { href: '/dashboard', label: 'Vue client', Icon: IconClients },
  { href: '/admin', label: 'Tableau de bord', Icon: IconDashboard },
  { href: '/admin/certificates', label: 'Certificats', Icon: IconDemandes },
  { href: '/admin/kyc', label: 'KYC', Icon: IconKyc },
  { href: '/admin/demandes', label: 'Demandes Trust', Icon: IconDemandes },
  { href: '/admin/users', label: 'Clients', Icon: IconClients },
  { href: '/admin/alerts', label: 'Alertes', Icon: IconAlertes },
  { href: '/admin/ai-alerts', label: 'Alertes IA', Icon: IconAlertes },
  { href: '/admin/surveillance', label: 'Surveillance IA', Icon: IconSurveillance },
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
      `/auth/signin?callbackUrl=${encodeURIComponent('/admin')}&reason=${reason}`
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
      className="flex h-screen overflow-hidden font-sans"
      style={{ background: 'var(--bt-navy)' }}
    >
      {/* Sidebar fixe */}
      <aside
        className="flex w-[220px] flex-shrink-0 flex-col overflow-y-auto border-r"
        style={{
          height: '100vh',
          background: 'rgba(6,14,26,0.9)',
          borderRightColor: 'var(--bt-border)',
        }}
      >
        {/* Bloc logo 60px */}
        <div
          className="flex flex-shrink-0 items-center gap-2.5 px-4 border-b"
          style={{
            height: 60,
            borderBottomColor: 'var(--bt-border)',
          }}
        >
          <Logo size="sm" withText={true} href="/admin" />
          <span
            className="rounded font-bold uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-mono-bt), monospace',
              fontSize: '9px',
              letterSpacing: '0.15em',
              color: '#0a1628',
              background: '#00d4ff',
              padding: '2px 6px',
              marginLeft: 2,
            }}
          >
            ADMIN
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navLinks.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-white"
              style={{ color: 'var(--bt-muted)' }}
            >
              <Icon />
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
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
