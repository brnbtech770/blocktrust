// app/admin/layout.tsx
// Layout pour le dashboard admin
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { hasAuthJsSessionCookie } from '@/app/lib/session-cookie-hints'
import { isRscPrefetchRequest } from '@/app/lib/is-rsc-prefetch-request'
import { rethrowIfRedirect } from '@/app/lib/is-redirect-error'
import { redirect } from 'next/navigation'
import SignOutButton from '@/app/components/SignOutButton'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import AdminPageHeader from '@/app/admin/AdminPageHeader'
import AdminNavLink from '@/app/admin/AdminNavLink'
import { prisma } from '@/app/lib/db'
import type { Metadata } from 'next'
import type { AdminNavIconName } from '@/app/admin/AdminNavLink'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

const navSections: {
  label: string
  links: { href: string; label: string; icon: AdminNavIconName }[]
}[] = [
  {
    label: "Vue d'ensemble",
    links: [
      { href: '/admin/dashboard', label: 'Tableau de bord', icon: 'LayoutDashboard' },
    ],
  },
  {
    label: 'Clients',
    links: [
      { href: '/admin/clients', label: 'Vue clients', icon: 'Users' },
      { href: '/admin/users', label: 'Utilisateurs', icon: 'UserCog' },
      { href: '/admin/organizations', label: 'Organisations B2B', icon: 'Building2' },
    ],
  },
  {
    label: 'Certification',
    links: [
      { href: '/admin/certificates', label: 'Certificats', icon: 'BadgeCheck' },
      { href: '/admin/kyc', label: 'KYC', icon: 'ShieldCheck' },
      { href: '/admin/demandes', label: 'Demandes Trust', icon: 'GitPullRequest' },
    ],
  },
  {
    label: 'Sécurité',
    links: [
      { href: '/admin/surveillance', label: 'Surveillance IA', icon: 'Activity' },
      { href: '/admin/ai-alerts', label: 'Alertes', icon: 'Bell' },
    ],
  },
  {
    label: 'Administration',
    links: [
      { href: '/admin/team', label: 'Équipe BLOCKTRUST', icon: 'Crown' },
    ],
  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
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

  const unreadAdminAlerts = await prisma.adminAlert
    .count({ where: { read: false } })
    .catch(() => 0)

  return (
    <div
      className="flex h-screen overflow-hidden overflow-x-hidden font-sans"
      style={{ background: 'var(--bt-navy)' }}
    >
      <aside
        className="flex w-[min(220px,85vw)] min-w-0 flex-shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r md:w-[220px]"
        style={{
          height: '100vh',
          background: 'rgba(6,14,26,0.9)',
          borderRightColor: 'var(--bt-border)',
        }}
      >
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

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="mb-1 px-3 pt-3 text-[10px] uppercase tracking-widest text-white/20">
                {section.label}
              </p>
              {section.links.map((link) => (
                <AdminNavLink
                  key={link.href}
                  {...link}
                  badge={link.href === '/admin/ai-alerts' ? unreadAdminAlerts : undefined}
                />
              ))}
            </div>
          ))}
        </nav>

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
          <a
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-3 rounded-lg border-t border-white/5 px-3 py-2 pt-4 text-sm text-white/40 transition hover:bg-white/5 hover:text-white/70"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            Mon espace personnel
          </a>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminPageHeader />
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8"
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  )
  } catch (error) {
    rethrowIfRedirect(error)
    console.error('[AdminLayout]', error)
    redirect('/dashboard')
  }
}
