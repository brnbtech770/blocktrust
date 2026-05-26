'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Loader2, Building2, MapPin, Briefcase, Hash } from 'lucide-react'
import { Logo } from '@/app/components/ui/Logo'
import { BiometricConsentModal } from '@/app/components/BiometricConsentModal'

type Step = 'select' | 'siret' | 'launching' | 'complete'

type SiretInfo = {
  siret: string
  siren: string
  raisonSociale: string
  adresse: string
  activite: string | null
  dateCreation: string | null
  etatAdministratif: 'Actif' | 'Fermé'
}

export function OnboardingVerifyClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('select')
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL')
  const [siret, setSiret] = useState('')
  const [siretStatus, setSiretStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [siretError, setSiretError] = useState<string | null>(null)
  const [siretInfo, setSiretInfo] = useState<SiretInfo | null>(null)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [consentDeclined, setConsentDeclined] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)

  const statusComplete = searchParams.get('status') === 'complete'

  useEffect(() => {
    if (statusComplete) setStep('complete')
  }, [statusComplete])

  const isSiretFormatValid = /^\d{14}$/.test(siret)

  async function checkSiret() {
    if (!isSiretFormatValid) {
      setSiretStatus('error')
      setSiretError('14 chiffres requis')
      setSiretInfo(null)
      return
    }
    setSiretStatus('loading')
    setSiretError(null)
    try {
      const res = await fetch('/api/kyc/siret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siret }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setSiretStatus('error')
        setSiretError(data.error || 'SIRET non trouvé')
        setSiretInfo(null)
        return
      }
      setSiretInfo({
        siret: data.siret,
        siren: data.siren,
        raisonSociale: data.raisonSociale,
        adresse: data.adresse,
        activite: data.activite,
        dateCreation: data.dateCreation,
        etatAdministratif: data.etatAdministratif,
      })
      setSiretStatus('ok')
    } catch {
      setSiretStatus('error')
      setSiretError('Erreur réseau, réessayez')
      setSiretInfo(null)
    }
  }

  async function startVerification() {
    setStep('launching')
    setConsentError(null)
    try {
      const res = await fetch('/api/kyc/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          ...(accountType === 'BUSINESS' && siretInfo
            ? {
                siret: siretInfo.siret,
                companyName: siretInfo.raisonSociale,
                address: siretInfo.adresse,
                activite: siretInfo.activite ?? undefined,
              }
            : {}),
        }),
      })
      const data = await res.json()
      if (res.status === 403 && data.code === 'BIOMETRIC_CONSENT_REQUIRED') {
        setShowConsentModal(true)
        setStep(accountType === 'BUSINESS' ? 'siret' : 'select')
        return
      }
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

  async function promptVerification() {
    setConsentDeclined(false)
    setConsentError(null)
    try {
      const res = await fetch('/api/kyc/consent', { credentials: 'include' })
      const data = (await res.json()) as { hasConsent?: boolean }
      if (res.ok && data.hasConsent) {
        await startVerification()
        return
      }
      setShowConsentModal(true)
    } catch {
      setConsentError('Impossible de vérifier le consentement. Réessayez.')
    }
  }

  async function handleConsentAccept() {
    setConsentError(null)
    try {
      const res = await fetch('/api/kyc/consent', {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || 'Erreur')
      }
      setShowConsentModal(false)
      await startVerification()
    } catch (e: unknown) {
      setConsentError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement du consentement')
      setShowConsentModal(false)
    }
  }

  function handleConsentDecline() {
    setShowConsentModal(false)
    setConsentDeclined(true)
  }

  const cardClass =
    'mx-auto max-w-[520px] rounded-xl border border-bt-cyan/20 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-gold/30'

  return (
    <div className="min-h-screen bt-circuit-bg" style={{ background: 'var(--bt-navy)', padding: 24 }}>
      <BiometricConsentModal
        isOpen={showConsentModal}
        onAccept={() => void handleConsentAccept()}
        onDecline={handleConsentDecline}
      />

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
                <Building2 className="w-6 h-6 text-[var(--bt-muted)]" />
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
            onClick={() => {
              if (accountType === 'BUSINESS') setStep('siret')
              else void promptVerification()
            }}
            className="w-full rounded-lg bg-bt-cyan py-3 font-bold text-navy transition hover:bg-bt-cyan/90"
          >
            {accountType === 'BUSINESS' ? 'Continuer' : 'Démarrer la vérification'}
          </button>

          {consentDeclined && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100/90"
            >
              Vous avez refusé la vérification biométrique. Stripe Identity ne sera pas lancé.
              Vous pouvez accéder au dashboard sans vérification d&apos;identité, mais votre
              TrustScore restera limité. Vous pourrez accepter plus tard depuis cette page.
            </div>
          )}

          {consentError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{consentError}</span>
            </div>
          )}
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
          <h2 className="font-syne mb-2 text-lg font-bold tracking-tight text-white">
            SIRET entreprise
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--bt-muted)' }}>
            Vérification en temps réel via le registre INSEE Sirene
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="14 chiffres"
              maxLength={14}
              value={siret}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 14)
                setSiret(cleaned)
                setSiretStatus('idle')
                setSiretError(null)
                setSiretInfo(null)
              }}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono tracking-wider text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
            />
            <button
              type="button"
              onClick={checkSiret}
              disabled={!isSiretFormatValid || siretStatus === 'loading'}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/10 px-4 py-3 text-sm font-semibold text-bt-cyan transition hover:bg-bt-cyan/20 disabled:opacity-40"
            >
              {siretStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Vérifier'
              )}
            </button>
          </div>

          {/* Indicateur format temps réel */}
          {siret.length > 0 && siret.length < 14 && (
            <p className="text-xs mb-2" style={{ color: 'var(--bt-muted)' }}>
              {siret.length}/14 chiffres
            </p>
          )}

          {siretStatus === 'error' && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{siretError}</span>
            </div>
          )}

          {siretStatus === 'ok' && siretInfo && (
            <div
              className="mb-4 rounded-xl border p-4"
              style={{ borderColor: 'rgba(29,184,126,0.4)', background: 'rgba(29,184,126,0.06)' }}
            >
              <div className="flex items-start gap-2 mb-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <p className="font-syne font-bold text-white">{siretInfo.raisonSociale}</p>
                  <p className="text-[11px] uppercase tracking-wider text-emerald-400">
                    Vérifié INSEE · {siretInfo.etatAdministratif}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-white/75">
                <li className="flex items-start gap-2">
                  <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                  <span className="font-mono">{siretInfo.siret}</span>
                </li>
                {siretInfo.adresse && (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span>{siretInfo.adresse}</span>
                  </li>
                )}
                {siretInfo.activite && (
                  <li className="flex items-start gap-2">
                    <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                    <span>Code APE {siretInfo.activite}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => void promptVerification()}
            disabled={siretStatus !== 'ok'}
            className="w-full rounded-lg bg-bt-cyan py-3 font-bold text-navy transition hover:bg-bt-cyan/90 disabled:opacity-50"
          >
            Démarrer la vérification
          </button>

          {consentDeclined && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100/90"
            >
              Vous avez refusé la vérification biométrique. Stripe Identity ne sera pas lancé.
              Vous pouvez continuer sans vérification d&apos;identité entreprise, mais votre
              TrustScore restera limité.
            </div>
          )}

          {consentError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{consentError}</span>
            </div>
          )}
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
