import { Suspense } from 'react'
import { OnboardingVerifyClient } from './OnboardingVerifyClient'

export default function OnboardingVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bt-navy)' }}>
        <div className="animate-spin w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    }>
      <OnboardingVerifyClient />
    </Suspense>
  )
}
