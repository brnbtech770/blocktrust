// app/components/dashboard/DashboardHeader.tsx
// Header du dashboard avec nom utilisateur et déconnexion
// ============================================================

'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'
import { signOutToHome } from '@/lib/sign-out-client'

const B2B_PLAN_IDS = new Set([
  'SOLO_PRO',
  'B2B_SOLO_PRO',
  'STARTER',
  'B2B_STARTER',
  'TEAM',
  'B2B_TEAM',
  'BUSINESS',
  'B2B_BUSINESS',
  'ENTERPRISE',
  'B2B_ENTERPRISE',
])

function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={`shrink-0 rounded-full border border-[#BDA76B]/20 bg-[#BDA76B]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#BDA76B] ${className ?? ''}`}
      title="Forfait professionnel"
    >
      Pro
    </span>
  )
}

export default function DashboardHeader() {
  const { data: session } = useSession()

  const firstName =
    session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Utilisateur'

  const plan = session?.user?.plan ?? ''
  const showProBadge = B2B_PLAN_IDS.has(plan)

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
            aria-label="Retour au tableau de bord BLOCKTRUST"
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
            <div className="flex items-center justify-end gap-2">
              <p className="truncate text-sm font-medium text-gold">{firstName}</p>
              {showProBadge ? <ProBadge /> : null}
            </div>
            {session?.user?.email ? (
              <p className="truncate text-xs text-gold/80">{session.user.email}</p>
            ) : null}
          </div>
          {showProBadge ? <ProBadge className="sm:hidden" /> : null}
          <button
            type="button"
            onClick={() => void signOutToHome()}
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
