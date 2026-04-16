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
    <div className="min-h-screen">
      <DashboardHeader />
      <BlockchainTicker />
      <div className="px-3 py-4 sm:px-5 sm:py-6 md:p-8 font-sans text-base leading-relaxed text-white/80">
        {children}
      </div>
    </div>
  )
}
