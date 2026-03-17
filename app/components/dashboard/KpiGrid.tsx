// app/components/dashboard/KpiGrid.tsx
// Grille KPI : certificats actifs, vérifications 7j, blockchain, alertes fraude
// ============================================================

'use client'

import type { DashboardStats } from '@/types/dashboard'
import { Shield, CheckCircle, Link2, AlertTriangle } from 'lucide-react'

export interface KpiGridProps {
  certs: number
  verifications: number
  blockchainStatus: DashboardStats['blockchainStatus']
  fraudAlerts: number
}

const statusLabel: Record<DashboardStats['blockchainStatus'], string> = {
  connected: 'Connecté',
  pending: 'En attente',
  unavailable: 'Indisponible',
}

export default function KpiGrid({
  certs,
  verifications,
  blockchainStatus,
  fraudAlerts,
}: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KpiCard
        label="Certificats actifs"
        value={String(certs)}
        sub="actifs / total"
        icon={<Shield className="w-5 h-5 text-[var(--bt-gold)]" />}
        accent="gold"
      />
      <KpiCard
        label="Vérifications (7j)"
        value={String(verifications)}
        sub="derniers 7 jours"
        icon={<CheckCircle className="w-5 h-5 text-[var(--bt-success)]" />}
        accent="success"
      />
      <KpiCard
        label="Blockchain"
        value={statusLabel[blockchainStatus]}
        sub="Polygon"
        icon={<Link2 className="w-5 h-5 text-[var(--bt-gold)]" />}
        accent="gold"
      />
      <KpiCard
        label="Alertes fraude"
        value={String(fraudAlerts)}
        sub="en attente"
        icon={<AlertTriangle className="w-5 h-5 text-[var(--bt-warn)]" />}
        accent={fraudAlerts > 0 ? 'warn' : 'muted'}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent: 'gold' | 'success' | 'warn' | 'muted'
}) {
  const borderColor =
    accent === 'gold'
      ? 'border-[var(--bt-gold)]/30'
      : accent === 'success'
        ? 'border-[var(--bt-success)]/30'
        : accent === 'warn'
          ? 'border-[var(--bt-warn)]/30'
          : 'border-gray-700'
  return (
    <div
      className={`rounded-xl border bg-[var(--bt-navy)]/60 backdrop-blur-sm p-5 ${borderColor}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-gray-400 font-medium mb-1" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
            {label}
          </p>
          <p className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-mono-bt), monospace' }}>
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}
