/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
'use client'

// Charge Vercel Analytics + SpeedInsights UNIQUEMENT après consentement explicite
// à la catégorie "Mesure d'audience". Aucun choix ou refus → rien n'est chargé.
// ============================================================

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { CONSENT_CHANGED_EVENT, readConsent } from '@/app/lib/cookie-consent'

export default function ConsentedAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const sync = () => setEnabled(readConsent()?.analytics === true)
    sync()
    window.addEventListener(CONSENT_CHANGED_EVENT, sync)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, sync)
  }, [])

  if (!enabled) return null

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
