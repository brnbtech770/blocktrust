// app/components/dashboard/DashboardHeader.tsx
// Header du dashboard avec nom utilisateur et déconnexion
// ============================================================

'use client'

import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { Logo } from '@/app/components/ui/Logo'

export default function DashboardHeader() {
  const { data: session } = useSession()
  
  const firstName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Utilisateur'

  return (
    <header
      className="sticky top-0 z-40 h-[60px] flex items-center border-b px-6 md:px-8"
      style={{
        background: 'rgba(6,14,26,0.95)',
        borderBottomColor: 'var(--bt-border)',
      }}
    >
      <div className="flex items-center justify-between w-full">
        <Logo size="md" withText={true} href="/dashboard" />
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs" style={{ color: 'var(--bt-muted)' }}>Connecté</p>
            <p className="text-sm font-semibold text-white">{firstName}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-[rgba(0,212,255,0.08)]"
            style={{ borderColor: 'var(--bt-border)', color: 'white' }}
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
