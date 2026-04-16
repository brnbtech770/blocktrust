'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/app/components/ui/Logo'

type Step = 'select' | 'siret' | 'launching' | 'complete'

export function OnboardingVerifyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('select')
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL')
  const [siret, setSiret] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [siretStatus, setSiretStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [siretError, setSiretError] = useState<string | null>(null)

  const statusComplete = searchParams.get('status') === 'complete'

  useEffect(() => {
    if (statusComplete) setStep('complete')
  }, [statusComplete])

  async function checkSiret() {
    if (!siret || siret.length !== 14) {
      setSiretStatus('error')
      setSiretError('14 chiffres requis')
      return
    }
    setSiretStatus('loading')
    setSiretError(null)
    try {
      const res = await fetch(`/api/kyc/siret?siret=${encodeURIComponent(siret)}`)
      const data = await res.json()
      if (!res.ok) {
        setSiretStatus('error')
        setSiretError(data.error || 'SIRET non trouvé')
        return
      }
      setCompanyName(data.companyName || '')
      setSiretStatus('ok')
    } catch {
      setSiretStatus('error')
      setSiretError('Erreur API')
    }
  }

  async function startVerification() {
    setStep('launching')
    try {
      const res = await fetch('/api/kyc/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          ...(accountType === 'BUSINESS' && siret ? { siret, companyName: companyName || undefined } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      if (data.url) {
        window.location.href = data.url
        return
      }
      throw new Error('URL manquante')
    } catch (e: unknown) {
      console.error(e)
      setStep(accountType === 'BUSINESS' ? 'siret' : 'select')
    }
  }

  const cardClass =
    'mx-auto max-w-[480px] rounded-xl border border-bt-cyan/20 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-gold/30'

  return (
    <div className="min-h-screen bt-circuit-bg" style={{ background: 'var(--bt-navy)', padding: 24 }}>
      <div className="flex justify-center pt-8 pb-6">
        <Logo size="lg" withText={false} href="/" />
      </div>

      {step === 'select' && (
        <div className={cardClass}>
          <h1 className="font-syne mb-2 text-2xl font-extrabold tracking-tight text-white">
            Vérification d&apos;identité
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--bt-muted)' }}>
            Étape obligatoire avant accès au dashboard
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setAccountType('INDIVIDUAL')}
              className="text-left p-4 rounded-xl border transition"
              style={{
                background: accountType === 'INDIVIDUAL' ? 'rgba(0,212,255,0.06)' : 'transparent',
                borderColor: accountType === 'INDIVIDUAL' ? '#00d4ff' : 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <PersonIcon className="w-6 h-6 text-[var(--bt-muted)]" />
                <span className="font-bold text-white">Particulier</span>
              </div>
              <ul className="text-xs space-y-1 mb-2" style={{ color: 'var(--bt-muted)' }}>
                <li>✓ Pièce d&apos;identité (CNI ou passeport)</li>
                <li>✓ Justificatif de domicile</li>
                <li>✓ Selfie avec pièce</li>
              </ul>
              <p className="text-xs" style={{ color: 'var(--bt-muted)' }}>Vérification automatique · 1,50€ unique</p>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('BUSINESS')}
              className="text-left p-4 rounded-xl border transition"
              style={{
                background: accountType === 'BUSINESS' ? 'rgba(0,212,255,0.06)' : 'transparent',
                borderColor: accountType === 'BUSINESS' ? '#00d4ff' : 'rgba(255,255,255,0.12)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <BuildingIcon className="w-6 h-6 text-[var(--bt-muted)]" />
                <span className="font-bold text-white">Entreprise</span>
              </div>
              <ul className="text-xs space-y-1 mb-2" style={{ color: 'var(--bt-muted)' }}>
                <li>✓ Kbis (moins de 3 mois)</li>
                <li>✓ Numéro SIRET</li>
                <li>✓ CNI du représentant légal</li>
                <li>✓ Selfie du représentant</li>
              </ul>
              <p className="text-xs" style={{ color: 'var(--bt-muted)' }}>Vérification automatique · 1,50€ unique</p>
            </button>
          </div>

          <button
            type="button"
            onClick={() => { if (accountType === 'BUSINESS') setStep('siret'); else startVerification(); }}
            className="w-full rounded-lg bg-bt-cyan py-3 font-bold text-navy transition hover:bg-bt-cyan/90"
          >
            {accountType === 'BUSINESS' ? 'Continuer' : 'Démarrer la vérification'}
          </button>
        </div>
      )}

      {step === 'siret' && (
        <div className={cardClass}>
          <button
            type="button"
            onClick={() => setStep('select')}
            className="text-sm mb-4"
            style={{ color: 'var(--bt-muted)' }}
          >
            ← Retour
          </button>
          <h2 className="font-syne mb-4 text-lg font-bold tracking-tight text-white">
            SIRET entreprise
          </h2>
          <input
            type="text"
            placeholder="14 chiffres"
            maxLength={14}
            value={siret}
            onChange={(e) => { setSiret(e.target.value.replace(/\D/g, '')); setSiretStatus('idle') }}
            onBlur={checkSiret}
            className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40"
          />
          {siretStatus === 'ok' && <p className="text-sm text-green-500 mb-2">✓ {companyName}</p>}
          {siretStatus === 'error' && <p className="text-sm text-red-400 mb-2">{siretError}</p>}
          <button
            type="button"
            onClick={startVerification}
            disabled={siret.length !== 14 || siretStatus !== 'ok'}
            className="w-full rounded-lg bg-bt-cyan py-3 font-bold text-navy transition hover:bg-bt-cyan/90 disabled:opacity-50"
          >
            Démarrer la vérification
          </button>
        </div>
      )}

      {step === 'launching' && (
        <div className={`${cardClass} text-center`}>
          <p className="text-white">Redirection vers Stripe Identity...</p>
          <div className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-2 border-bt-cyan border-t-transparent" />
        </div>
      )}

      {step === 'complete' && (
        <div className={`${cardClass} text-center`}>
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">
            Vérification soumise
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--bt-muted)' }}>
            Vous recevrez un email de confirmation sous 24h.
          </p>
          <button
            type="button"
            onClick={() => router.push('/onboarding/pending')}
            className="w-full rounded-lg bg-bt-cyan py-3 font-bold text-navy transition hover:bg-bt-cyan/90"
          >
            Vérifier le statut
          </button>
        </div>
      )}
    </div>
  )
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
