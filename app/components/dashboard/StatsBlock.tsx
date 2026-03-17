// app/components/dashboard/StatsBlock.tsx
// Client : fetch /api/stats puis affiche KpiGrid ou KpiGridSkeleton
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import type { DashboardStats } from '@/types/dashboard'
import KpiGrid from './KpiGrid'
import KpiGridSkeleton from './KpiGridSkeleton'

export default function StatsBlock() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Erreur stats')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="mb-8 rounded-xl border border-[var(--bt-danger)]/30 bg-[var(--bt-danger)]/10 p-4 text-[var(--bt-danger)] text-sm">
        Impossible de charger les statistiques.
      </div>
    )
  }

  if (!stats) return <KpiGridSkeleton />

  return (
    <KpiGrid
      certs={stats.activeCerts}
      verifications={stats.verifications7d}
      blockchainStatus={stats.blockchainStatus}
      fraudAlerts={stats.fraudAlerts}
    />
  )
}
