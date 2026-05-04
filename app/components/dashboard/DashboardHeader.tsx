// app/components/dashboard/DashboardHeader.tsx
// Header du dashboard avec nom utilisateur et déconnexion
// ============================================================

'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'

export default function DashboardHeader() {
  const { data: session } = useSession()

  const firstName =
    session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Utilisateur'

  return (
    <header
      className="sticky top-0 z-40 flex min-h-[52px] items-center border-b py-2 pl-12 pr-3 sm:min-h-[60px] sm:pl-14 sm:pr-4 md:pl-16 md:pr-6 lg:px-8"
      style={{
        background: 'rgba(6,14,26,0.95)',
        borderBottomColor: 'var(--bt-border)',
      }}
    >
      <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 sm:gap-4 lg:px-0">
        <div className="min-w-0 shrink">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 sm:gap-3"
            style={{ textDecoration: 'none' }}
            aria-label="Retour au tableau de bord BlockTrust"
          >
            <BlockTrustBadge size={36} instanceId="dashboard-header" showWatermark={false} className="shrink-0" />
            <span className="font-syne text-base font-bold leading-none tracking-wider text-bt-cyan sm:text-lg">
              BLOCKTRUST
            </span>
          </Link>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-gold/90">Connecté</p>
            <p className="truncate text-sm font-medium text-gold">{firstName}</p>
            {session?.user?.email ? (
              <p className="truncate text-xs text-gold/80">{session.user.email}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="min-w-0 shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[rgba(0,212,255,0.08)] sm:px-4 sm:text-base"
            style={{ borderColor: 'var(--bt-border)', color: 'white' }}
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
