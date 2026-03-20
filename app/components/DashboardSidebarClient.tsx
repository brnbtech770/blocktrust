'use client'

// app/components/DashboardSidebarClient.tsx
// Sidebar client pour les pages client-side
// ============================================================

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import SignOutButton from './SignOutButton'

export default function DashboardSidebarClient() {
  const { data: session } = useSession()
  const [trustCircleEnabled, setTrustCircleEnabled] = useState(false)

  useEffect(() => {
    // Récupérer le plan de l'utilisateur pour vérifier Trust Circle
    if (session?.user?.email) {
      fetch('/api/stripe/subscription')
        .then((res) => res.json())
        .then((data) => {
          if (data.plan?.trustCircleEnabled) {
            setTrustCircleEnabled(true)
          }
        })
        .catch(() => {})
    }
  }, [session])

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-6">
      <div className="text-3xl font-bold text-white mb-8 tracking-tight">🛡️ BlockTrust</div>

      <nav className="space-y-1">
        <a
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 text-base text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium"
        >
          <span className="text-lg">📊</span> Dashboard
        </a>
        <a
          href="/dashboard/certificates"
          className="flex items-center gap-3 px-4 py-3 text-base text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium"
        >
          <span className="text-lg">📜</span> Mes certificats
        </a>
        <a
          href="/dashboard/create"
          className="flex items-center gap-3 px-4 py-3 text-base text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium"
        >
          <span className="text-lg">➕</span> Créer
        </a>
        {trustCircleEnabled ? (
          <a
            href="/dashboard/trust-circle"
            className="flex items-center gap-3 px-4 py-3 text-base text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium"
          >
            <span className="text-lg">🔗</span> Trust Circle
          </a>
        ) : (
          <a
            href={`/pricing?feature=trustCircle&message=${encodeURIComponent(
              'Abonnez-vous pour accéder au Trust Circle — disponible à partir des offres Famille et équivalents B2B.'
            )}`}
            className="flex items-center gap-3 px-4 py-3 text-base text-amber-200/90 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium border border-amber-500/30"
          >
            <span className="text-lg">🔗</span>
            <span>
              Trust Circle
              <span className="block text-xs font-normal text-amber-400/90 mt-0.5">
                Abonnez-vous pour accéder
              </span>
            </span>
          </a>
        )}
        <a
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-3 text-base text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium"
        >
          <span className="text-lg">⚙️</span> Paramètres
        </a>
        <a
          href="/dashboard/billing"
          className="flex items-center gap-3 px-4 py-3 text-base text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors font-medium"
        >
          <span className="text-lg">💳</span> Facturation
        </a>
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <SignOutButton />
      </div>
    </aside>
  )
}
