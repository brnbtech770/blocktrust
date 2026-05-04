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
    <div className="min-h-screen overflow-x-hidden">
      <DashboardHeader />
      <BlockchainTicker />
      <div
        data-dashboard-main
        className="mx-auto max-w-7xl px-4 py-4 font-sans text-base leading-relaxed text-white/70 sm:px-6 sm:py-5 md:py-6 lg:px-8 [&_h1]:font-syne [&_h1]:font-bold [&_h1]:shadow-none [&_h2]:font-syne [&_h2]:font-bold [&_h2]:shadow-none [&_h3]:font-syne [&_h3]:font-bold [&_h3]:shadow-none"
      >
        {children}
      </div>
    </div>
  )
}
