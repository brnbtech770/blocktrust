// app/components/dashboard/DashboardLayout.tsx
// Wrapper dashboard : header + ticker blockchain + contenu (sidebar géré par app/dashboard/layout)
// ============================================================

'use client'

import BlockchainTicker from './BlockchainTicker'
import DashboardHeader from './DashboardHeader'
import OnboardingAssistant from '@/app/components/onboarding/OnboardingAssistant'
import EmailVerificationBanner from '@/app/components/dashboard/EmailVerificationBanner'

export type DashboardOnboardingState = {
  onboardingCompletedAt: string | null
  lastLoginAt: string | null
}

export type DashboardEmailVerificationState = {
  showBanner: boolean
  email: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
  onboarding?: DashboardOnboardingState | null
  emailVerification?: DashboardEmailVerificationState | null
  showOnboardingAssistant?: boolean
}

export default function DashboardLayout({
  children,
  onboarding,
  emailVerification,
  showOnboardingAssistant = true,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <DashboardHeader />
      {emailVerification?.showBanner ? (
        <EmailVerificationBanner email={emailVerification.email} />
      ) : null}
      <BlockchainTicker />
      <div
        data-dashboard-main
        className="mx-auto max-w-7xl px-4 py-4 font-sans text-base leading-relaxed text-white/70 sm:px-6 sm:py-5 md:py-6 lg:px-8 [&_h1]:font-syne [&_h1]:font-bold [&_h1]:shadow-none [&_h2]:font-syne [&_h2]:font-bold [&_h2]:shadow-none [&_h3]:font-syne [&_h3]:font-bold [&_h3]:shadow-none"
      >
        {children}
      </div>
      {showOnboardingAssistant && onboarding ? (
        <OnboardingAssistant
          onboardingCompletedAt={onboarding.onboardingCompletedAt}
          lastLoginAt={onboarding.lastLoginAt}
        />
      ) : null}
    </div>
  )
}
