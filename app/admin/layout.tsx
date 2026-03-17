// app/admin/layout.tsx
// Layout pour le dashboard admin
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { redirect } from 'next/navigation'
import SignOutButton from '@/app/components/SignOutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/')
  }

  if (!isAdmin(session.user.email)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 p-6">
        <div className="text-2xl font-bold text-white mb-8 tracking-tight">
          🛡️ BlockTrust <span className="text-xs font-semibold text-red-400 ml-1">Admin</span>
        </div>

        <nav className="space-y-1">
          <a
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <span className="text-lg">📊</span> Tableau de bord
          </a>
          <a
            href="/admin/certificates"
            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <span className="text-lg">📜</span> Demandes
          </a>
          <a
            href="/admin/users"
            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <span className="text-lg">👥</span> Clients
          </a>
          <a
            href="/admin/alerts"
            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <span className="text-lg">🚨</span> Alertes
          </a>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">Admin</p>
                <p className="text-gray-400 text-xs truncate">{session.user.email}</p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">{children}</main>
    </div>
  )
}
