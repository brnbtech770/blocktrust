'use client'

// Bannière cookies RGPD — bas de page, persistance localStorage + sync API si connecté
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const STORAGE_KEY = 'blocktrust_cookie_consent'

type ConsentValue = 'accepted' | 'rejected'

function readStorage(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'accepted' || v === 'rejected') return v
  return null
}

export default function CookieBanner() {
  const { data: session, status, update } = useSession()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  const sessionConsent = session?.user?.cookieConsent === true

  const evaluateVisibility = useCallback(() => {
    if (typeof window === 'undefined') return
    const ls = readStorage()
    if (sessionConsent) {
      setVisible(false)
      return
    }
    if (ls !== null) {
      setVisible(false)
      return
    }
    if (status === 'loading') return
    setVisible(true)
  }, [sessionConsent, status])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    evaluateVisibility()
  }, [evaluateVisibility])

  // Visiteur ayant accepté avant connexion : synchroniser la base
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    if (session.user.cookieConsent) return
    const ls = readStorage()
    if (ls !== 'accepted') return

    let cancelled = false
    ;(async () => {
      try {
        await fetch('/api/user/cookie-consent', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accepted: true }),
        })
        if (!cancelled) await update?.()
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, session?.user?.id, session?.user?.cookieConsent, update])

  async function persistChoice(accepted: boolean) {
    const value: ConsentValue = accepted ? 'accepted' : 'rejected'
    localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)
    try {
      await fetch('/api/user/cookie-consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      })
      if (status === 'authenticated') await update?.()
    } catch {
      /* localStorage suffit pour masquer la bannière */
    }
  }

  if (!mounted || !visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a1628]/95 px-4 py-4 backdrop-blur-md sm:px-6"
      role="dialog"
      aria-label="Préférences cookies"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-center text-sm text-white/70 sm:text-left">
          BLOCKTRUST utilise des cookies nécessaires au fonctionnement du service et des cookies
          analytiques anonymes.{' '}
          <Link href="/privacy" className="text-[#00d4ff] underline hover:brightness-110">
            En savoir plus
          </Link>
        </p>
        <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => persistChoice(false)}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/5"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => persistChoice(true)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#0a1628] transition hover:brightness-110"
            style={{ background: '#00d4ff' }}
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
