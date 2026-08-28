'use client'

import { HelpCircle } from 'lucide-react'

export default function DashboardGuideButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('bt-open-onboarding'))
      }}
      className="mt-3 flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-bt-cyan/25 bg-bt-cyan/10 px-3 py-2.5 text-left text-sm font-medium text-bt-cyan transition hover:bg-bt-cyan/20"
    >
      <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
      Guide & aide
    </button>
  )
}
