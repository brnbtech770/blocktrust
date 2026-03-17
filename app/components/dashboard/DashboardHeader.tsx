// app/components/dashboard/DashboardHeader.tsx
// Header du dashboard avec nom utilisateur et déconnexion
// ============================================================

'use client'

import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'

export default function DashboardHeader() {
  const { data: session } = useSession()
  
  const firstName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Utilisateur'

  return (
    <header className="sticky top-0 z-40 bg-[var(--bt-navy)]/95 backdrop-blur-sm border-b border-[var(--bt-gold)]/20">
      <div className="flex items-center justify-between px-6 md:px-8 py-4">
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          Mon espace
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Connecté</p>
            <p className="text-sm font-semibold text-[var(--bt-gold)]">{firstName}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 border border-[var(--bt-gold)]/40 text-[var(--bt-gold)] hover:bg-[var(--bt-gold)]/10 rounded-lg transition-colors text-sm font-medium"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
