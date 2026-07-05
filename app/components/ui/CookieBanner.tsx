'use client'

// Bannière cookies CNIL / ePrivacy — 3 choix de niveau égal + panneau de paramétrage.
// Catégories : Essentiels (toujours actifs) / Mesure d'audience (OFF par défaut).
// Persistance localStorage (catégories + date, expiration 6 mois) + trace serveur.
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Cookie, ShieldCheck, BarChart3 } from 'lucide-react'
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_OPEN_SETTINGS_EVENT,
  readConsent,
  writeConsent,
} from '@/app/lib/cookie-consent'

export default function CookieBanner() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  // Toggle catégorie "Mesure d'audience" — OFF par défaut (aucune case pré-cochée).
  const [analyticsOn, setAnalyticsOn] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Affichage initial : visible si aucun choix valide (absent ou expiré > 6 mois).
  useEffect(() => {
    if (!mounted) return
    const consent = readConsent()
    if (consent) {
      setAnalyticsOn(consent.analytics)
      setVisible(false)
    } else {
      setAnalyticsOn(false)
      setVisible(true)
    }
  }, [mounted])

  // Réouverture du panneau depuis le footer ("Gestion des cookies"), à tout moment.
  useEffect(() => {
    const openSettings = () => {
      const consent = readConsent()
      setAnalyticsOn(consent?.analytics ?? false)
      setShowSettings(true)
      setVisible(true)
    }
    window.addEventListener(CONSENT_OPEN_SETTINGS_EVENT, openSettings)
    return () => window.removeEventListener(CONSENT_OPEN_SETTINGS_EVENT, openSettings)
  }, [])

  // Trace serveur : enregistre le consentement mesure d'audience pour l'utilisateur connecté.
  const persistServer = useCallback(async (analytics: boolean) => {
    try {
      await fetch('/api/user/cookie-consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accepted: analytics }),
      })
    } catch {
      /* localStorage + event suffisent au gating côté client */
    }
  }, [])

  const applyChoice = useCallback(
    (analytics: boolean) => {
      writeConsent(analytics) // émet CONSENT_CHANGED_EVENT → (dé)charge l'audience
      setAnalyticsOn(analytics)
      setShowSettings(false)
      setVisible(false)
      void persistServer(analytics)
    },
    [persistServer],
  )

  if (!mounted || !visible) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0a1628]/95 px-4 py-4 backdrop-blur-md sm:px-6"
      role="dialog"
      aria-modal="false"
      aria-label="Préférences cookies"
    >
      <div className="mx-auto max-w-6xl">
        {!showSettings ? (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="flex items-start gap-2 text-center text-sm text-white/70 sm:text-left">
              <Cookie className="mt-0.5 hidden h-4 w-4 flex-shrink-0 text-[#00d4ff] sm:block" />
              <span>
                BLOCKTRUST utilise des cookies nécessaires au fonctionnement du service.
                Avec votre accord, nous utilisons aussi une mesure d&apos;audience.{' '}
                <Link href="/privacy" className="text-[#00d4ff] underline hover:brightness-110">
                  En savoir plus
                </Link>
              </span>
            </p>
            <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => applyChoice(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/5"
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnalyticsOn(readConsent()?.analytics ?? false)
                  setShowSettings(true)
                }}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/5"
              >
                Paramétrer mes choix
              </button>
              <button
                type="button"
                onClick={() => applyChoice(true)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#0a1628] transition hover:brightness-110"
                style={{ background: '#00d4ff' }}
              >
                Accepter
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Cookie className="h-4 w-4 text-[#00d4ff]" />
              <p className="text-sm font-semibold text-white">Préférences cookies</p>
            </div>

            {/* Catégorie : Essentiels (toujours actifs, non désactivables) */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10b981]" />
                <div>
                  <p className="text-sm font-medium text-white">Essentiels</p>
                  <p className="text-xs text-white/60">
                    Nécessaires au fonctionnement (session, sécurité). Toujours actifs.
                  </p>
                </div>
              </div>
              <span
                role="switch"
                aria-checked="true"
                aria-disabled="true"
                aria-label="Cookies essentiels (toujours actifs)"
                className="mt-1 inline-flex h-5 w-9 flex-shrink-0 cursor-not-allowed items-center rounded-full bg-[#10b981]/70 px-0.5"
              >
                <span className="h-4 w-4 translate-x-4 rounded-full bg-white" />
              </span>
            </div>

            {/* Catégorie : Mesure d'audience (désactivable, OFF par défaut) */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start gap-2">
                <BarChart3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#00d4ff]" />
                <div>
                  <p className="text-sm font-medium text-white">Mesure d&apos;audience</p>
                  <p className="text-xs text-white/60">
                    Statistiques de fréquentation (Vercel Analytics / SpeedInsights).
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={analyticsOn}
                aria-label="Activer la mesure d'audience"
                onClick={() => setAnalyticsOn((v) => !v)}
                className={`mt-1 inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full px-0.5 transition ${
                  analyticsOn ? 'bg-[#00d4ff]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${
                    analyticsOn ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => applyChoice(false)}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/5"
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={() => applyChoice(analyticsOn)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#0a1628] transition hover:brightness-110"
                style={{ background: '#00d4ff' }}
              >
                Enregistrer mes choix
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
