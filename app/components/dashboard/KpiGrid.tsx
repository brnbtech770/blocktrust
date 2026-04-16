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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
      <KpiCard
        label="Certificats actifs"
        value={String(certs)}
        sub="actifs / total"
        icon={<Shield className="w-5 h-5 shrink-0 text-bt-cyan" />}
        accent="gold"
      />
      <KpiCard
        label="Vérifications (7j)"
        value={String(verifications)}
        sub="derniers 7 jours"
        icon={<CheckCircle className="w-5 h-5 shrink-0 text-[var(--bt-success)]" />}
        accent="success"
      />
      <KpiCard
        label="Blockchain"
        value={statusLabel[blockchainStatus]}
        sub="Polygon"
        icon={<Link2 className="w-5 h-5 shrink-0 text-gold" />}
        accent="gold"
      />
      <KpiCard
        label="Alertes fraude"
        value={String(fraudAlerts)}
        sub="en attente"
        icon={<AlertTriangle className="w-5 h-5 shrink-0 text-[var(--bt-warn)]" />}
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
  const topBorder =
    accent === 'gold'
      ? 'var(--bt-gold)'
      : accent === 'success'
        ? 'var(--bt-success)'
        : accent === 'warn'
          ? 'var(--bt-warn)'
          : 'var(--bt-cyan)'
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-gold/30 md:p-5">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: topBorder }} />
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="font-sans text-xs font-medium uppercase tracking-wider text-white/50 mb-1">
            {label}
          </p>
          <p className="font-mono text-3xl font-bold text-white tabular-nums tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">
            {value}
          </p>
          <p className="font-mono text-[10px] mt-1 truncate text-white/50">{sub}</p>
        </div>
        <div className="shrink-0">{icon}</div>
      </div>
    </div>
  )
}
