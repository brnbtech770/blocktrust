// app/components/dashboard/DashboardLayout.tsx
// Wrapper dashboard : header + ticker blockchain + contenu (sidebar géré par app/dashboard/layout)
// ============================================================

'use client'

import BlockchainTicker from './BlockchainTicker'
import DashboardHeader from './DashboardHeader'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bt-grid-subtle">
      <DashboardHeader />
      <BlockchainTicker />
      <div className="p-6 md:p-8">{children}</div>
    </div>
  )
}
