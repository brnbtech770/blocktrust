// app/components/dashboard/KpiGrid.tsx
// Grille KPI : certificats, contacts, vérifications 7j, blockchain, alertes fraude
// ============================================================

import type { ReactNode } from 'react'
import type { DashboardStats } from '@/types/dashboard'
import { Shield, CheckCircle, Link2, AlertTriangle, Users } from 'lucide-react'

export interface KpiGridProps {
  certs: number
  contacts: number
  verifications: number
  blockchainStatus: DashboardStats['blockchainStatus']
  fraudAlerts: number
  polygonExplorerUrl?: string | null
}

const statusLabel: Record<DashboardStats['blockchainStatus'], string> = {
  connected: 'Ancré ✓',
  pending: 'En attente',
  unavailable: 'Indisponible',
}

export default function KpiGrid({
  certs,
  contacts,
  verifications,
  blockchainStatus,
  fraudAlerts,
  polygonExplorerUrl,
}: KpiGridProps) {
  const blockchainValue: ReactNode =
    blockchainStatus === 'connected' ? (
      <span className="text-bt-cyan">Ancré ✓</span>
    ) : (
      statusLabel[blockchainStatus]
    )

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:mb-8 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="Certificats actifs"
        value={String(certs)}
        sub="actifs / total"
        icon={<Shield className="h-5 w-5 shrink-0 text-bt-cyan" />}
        accent="brand"
      />
      <KpiCard
        label="Contacts"
        value={String(contacts)}
        sub="dans votre espace"
        icon={<Users className="h-5 w-5 shrink-0 text-bt-cyan" />}
        accent="brand"
      />
      <KpiCard
        label="Vérifications (7j)"
        value={String(verifications)}
        sub="derniers 7 jours"
        icon={<CheckCircle className="h-5 w-5 shrink-0 text-[var(--bt-success)]" />}
        accent="success"
      />
      <KpiCard
        label="Blockchain"
        value={blockchainValue}
        sub="Polygon"
        icon={<Link2 className="h-5 w-5 shrink-0 text-bt-cyan" />}
        accent={blockchainStatus === 'connected' ? 'success' : 'brand'}
        footer={
          blockchainStatus === 'connected' && polygonExplorerUrl ? (
            <a
              href={polygonExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex font-mono text-[10px] text-bt-cyan hover:underline"
            >
              Voir sur PolygonScan ↗
            </a>
          ) : null
        }
      />
      <KpiCard
        label="Alertes fraude"
        value={String(fraudAlerts)}
        sub="en attente"
        icon={<AlertTriangle className="h-5 w-5 shrink-0 text-[var(--bt-warn)]" />}
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
  footer,
}: {
  label: string
  value: ReactNode
  sub: string
  icon: ReactNode
  accent: 'brand' | 'success' | 'warn' | 'muted'
  footer?: ReactNode
}) {
  const topBorder =
    accent === 'brand'
      ? 'var(--bt-gold)'
      : accent === 'success'
        ? 'var(--bt-success)'
        : accent === 'warn'
          ? 'var(--bt-warn)'
          : 'var(--bt-cyan)'
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-gold/30 md:p-5">
      <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: topBorder }} />
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="mb-1 font-sans text-xs font-medium uppercase tracking-wider text-white/50">
            {label}
          </p>
          <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-white">{value}</p>
          <p className="mt-1 truncate font-mono text-[10px] text-white/50">{sub}</p>
          {footer}
        </div>
        <div className="shrink-0">{icon}</div>
      </div>
    </div>
  )
}
