'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ArrowUpRight,
  Check,
  Chrome,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import SignOutButton from '@/app/components/SignOutButton'
import Link from 'next/link'
import PasswordStrengthIndicator from '@/app/components/auth/PasswordStrengthIndicator'
import { validatePassword } from '@/lib/password-policy'
import type { DelegationRightsSummary } from '@/lib/trust-delegation'
import {
  CertifiedEmailsTagInput,
  CertifiedPhonesTagInput,
  DomainTagInput,
} from '@/app/components/ui/TagInput'
import type { PlanWording } from '@/lib/plan-wording'
import {
  isValidCertifiedEmail,
  isValidCertifiedPhone,
  normalizeCertifiedEmailInput,
  normalizeCertifiedPhoneInput,
} from '@/lib/certified-contact'

export type SettingsClientUser = {
  email: string
  name: string | null
  image: string | null
}

export type CertifiedContactsInitial = {
  certifiedEmails: string[]
  certifiedPhones: string[]
  certifiedDomains: string[]
}

export type ExtensionKeyInitial = {
  hasKey: boolean
  masked: string | null
}

function SimpleCertifiedSection({
  email,
  phone,
  onChangeEmail,
  onChangePhone,
}: {
  email: string
  phone: string
  onChangeEmail: (v: string) => void
  onChangePhone: (v: string) => void
}) {
  return (
    <>
      <div className="mb-6 space-y-3">
        <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60">
          <Mail className="h-3 w-3 shrink-0" aria-hidden />
          Email officiel
        </label>
        <p className="text-xs text-white/30">
          Une seule adresse certifiée avec votre forfait. Vos contacts seront alertés si un email provient
          d&apos;une autre adresse.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => onChangeEmail(e.target.value)}
          autoComplete="email"
          placeholder="votre@email.com"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#00d4ff]/50 focus:outline-none"
        />
      </div>

      <div className="mb-6 space-y-3">
        <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60">
          <Phone className="h-3 w-3 shrink-0" aria-hidden />
          Téléphone officiel
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onChangePhone(e.target.value)}
          autoComplete="tel"
          placeholder="+33612345678"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#00d4ff]/50 focus:outline-none"
        />
      </div>
    </>
  )
}

function ProCertifiedSection({
  wording,
  certifiedEmails,
  certifiedPhones,
  certifiedDomains,
  setCertifiedEmails,
  setCertifiedPhones,
  setCertifiedDomains,
}: {
  wording: PlanWording
  certifiedEmails: string[]
  certifiedPhones: string[]
  certifiedDomains: string[]
  setCertifiedEmails: (v: string[]) => void
  setCertifiedPhones: (v: string[]) => void
  setCertifiedDomains: (v: string[]) => void
}) {
  return (
    <>
      <div className="mb-6 space-y-3">
        <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60">
          <Mail className="h-3 w-3 shrink-0" aria-hidden />
          Emails officiels
        </label>
        <p className="text-xs text-white/30">
          Ajoutez vos adresses email officielles. Vos contacts seront alertés si un email provient
          d&apos;une autre adresse.
        </p>
        <CertifiedEmailsTagInput
          values={certifiedEmails}
          onChange={setCertifiedEmails}
          placeholder="votre@email.com"
          maxItems={wording.maxCertifiedEmails}
        />
      </div>

      <div className="mb-6 space-y-3">
        <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60">
          <Phone className="h-3 w-3 shrink-0" aria-hidden />
          Téléphones officiels
        </label>
        <CertifiedPhonesTagInput
          values={certifiedPhones}
          onChange={setCertifiedPhones}
          placeholder="+33612345678"
          maxItems={wording.maxCertifiedPhones}
        />
      </div>

      {wording.canCertifyDomains ? (
        <div className="mb-6 space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/60">
            <Globe className="h-3 w-3 shrink-0" aria-hidden />
            Domaines officiels
          </label>
          <p className="text-xs text-white/30">
            Ex. monentreprise.fr — protège contre les sites miroirs
          </p>
          <DomainTagInput
            values={certifiedDomains}
            onChange={setCertifiedDomains}
            placeholder="mondomaine.fr"
            maxItems={wording.maxCertifiedDomains}
          />
        </div>
      ) : null}
    </>
  )
}

function PasswordSection({
  initialHasPassword,
  userEmail,
}: {
  initialHasPassword: boolean
  userEmail: string
}) {
  const { update } = useSession()
  const [hasPassword, setHasPassword] = useState(initialHasPassword)
  const [expanded, setExpanded] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function resetForm() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
  }

  function openForm() {
    resetForm()
    setSuccess(null)
    setExpanded(true)
  }

  function closeForm() {
    resetForm()
    setExpanded(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    const policy = validatePassword(newPassword, userEmail)
    if (!policy.valid) {
      setError(policy.errors[0] ?? 'Mot de passe invalide.')
      return
    }

    setLoading(true)
    try {
      const body: Record<string, string> = {
        newPassword,
        confirmPassword,
      }
      if (hasPassword) {
        body.currentPassword = currentPassword
      }

      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        mode?: 'set' | 'changed'
        sessionVersion?: number
      }

      if (!res.ok) {
        setError(data.error ?? 'Impossible de mettre à jour le mot de passe.')
        return
      }

      if (data.mode === 'set') {
        setSuccess(
          'Mot de passe défini. Vous pouvez maintenant vous connecter avec votre email et ce mot de passe.'
        )
        setHasPassword(true)
      } else {
        setSuccess('Mot de passe mis à jour.')
        if (typeof data.sessionVersion === 'number') {
          await update({ sessionVersion: data.sessionVersion })
        }
      }
      resetForm()
      setExpanded(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/10">
            <KeyRound className="h-4 w-4 text-[#00d4ff]" aria-hidden />
          </div>
          <div>
            <h2 className="font-syne text-2xl font-semibold tracking-tight text-white">Mot de passe</h2>
            <p className="mt-1 text-sm text-white/50">
              {hasPassword
                ? 'Modifiez votre mot de passe de connexion email.'
                : 'Compte créé avec Google — définissez un mot de passe pour vous connecter aussi par email.'}
            </p>
          </div>
        </div>
        {!expanded ? (
          <button
            type="button"
            onClick={openForm}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-4 py-2 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/25"
          >
            {hasPassword ? 'Modifier le mot de passe' : 'Définir un mot de passe'}
          </button>
        ) : null}
      </div>

      {success ? (
        <p className="mb-4 flex items-center gap-1 text-sm text-emerald-400" role="status">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {success}
        </p>
      ) : null}

      {expanded ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {hasPassword ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/90">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#00d4ff]/50 focus:outline-none"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/90">
              {hasPassword ? 'Nouveau mot de passe' : 'Mot de passe'}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#00d4ff]/50 focus:outline-none"
            />
            <PasswordStrengthIndicator password={newPassword} email={userEmail} />
            <p className="mt-1 text-xs text-white/45">
              Minimum 8 caractères · majuscule · minuscule · chiffre · caractère spécial
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/90">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#00d4ff]/50 focus:outline-none"
            />
          </div>

          {error ? (
            <p className="text-sm text-[#E05252]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#00d4ff]/40 bg-[#00d4ff]/20 px-5 py-2.5 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={loading}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function AccountDeletionSection({
  accountDeletionScheduledAt,
  hasActiveSubscription,
}: {
  accountDeletionScheduledAt: string | null
  hasActiveSubscription: boolean
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState<string | null>(accountDeletionScheduledAt)

  async function handleScheduleDeletion() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmation: 'SUPPRIMER' }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        scheduledAt?: string
        billingUrl?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Suppression impossible.')
        return
      }
      setScheduledAt(data.scheduledAt ?? null)
      setStep(0)
      setConfirmation('')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelDeletion() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/user/account', {
        method: 'PATCH',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? 'Annulation impossible.')
        return
      }
      setScheduledAt(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-[#E05252]/30 bg-[#E05252]/5 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E05252]/30 bg-[#E05252]/10">
          <Trash2 className="h-4 w-4 text-[#E05252]" aria-hidden />
        </div>
        <div>
          <h2 className="font-syne text-2xl font-semibold tracking-tight text-white">
            Supprimer mon compte
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Droit à l&apos;effacement (RGPD). Action irréversible après 30 jours.
          </p>
        </div>
      </div>

      {scheduledAt ? (
        <div className="space-y-3 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4">
          <p className="text-sm text-[#f59e0b]">
            Suppression programmée le{' '}
            {new Date(scheduledAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            . Reconnectez-vous pour annuler.
          </p>
          <button
            type="button"
            onClick={() => void handleCancelDeletion()}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5 disabled:opacity-50"
          >
            Annuler la suppression
          </button>
        </div>
      ) : step === 0 ? (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setStep(1)
          }}
          className="inline-flex min-h-[44px] items-center rounded-lg border border-[#E05252]/40 px-4 py-2 text-sm font-semibold text-[#E05252] transition hover:bg-[#E05252]/10"
        >
          Supprimer mon compte
        </button>
      ) : step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-white/70">
            Êtes-vous sûr ? Cette action est <strong className="text-white">IRRÉVERSIBLE</strong>{' '}
            après le délai de grâce de 30 jours.
          </p>
          {hasActiveSubscription ? (
            <p className="text-sm text-[#f59e0b]">
              Vous avez un abonnement actif.{' '}
              <Link href="/dashboard/billing" className="text-[#00d4ff] underline">
                Annulez-le
              </Link>{' '}
              avant de supprimer votre compte.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={hasActiveSubscription}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-[#E05252]/40 bg-[#E05252]/15 px-4 py-2 text-sm font-semibold text-[#E05252] transition hover:bg-[#E05252]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuer
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-white/70">Tapez SUPPRIMER pour confirmer.</p>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            placeholder="SUPPRIMER"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:border-[#E05252]/50 focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleScheduleDeletion()}
              disabled={loading || confirmation !== 'SUPPRIMER'}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-[#E05252]/40 bg-[#E05252]/20 px-4 py-2 text-sm font-semibold text-[#E05252] transition hover:bg-[#E05252]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Traitement…' : 'Confirmer la suppression'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(0)
                setConfirmation('')
              }}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-[#E05252]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}

export default function SettingsClient({
  user,
  hasPassword,
  extensionKeyInitial,
  certifiedContacts,
  planWording,
  delegationRights,
  accountDeletionScheduledAt,
  hasActiveSubscription,
}: {
  user: SettingsClientUser
  hasPassword: boolean
  extensionKeyInitial: ExtensionKeyInitial
  certifiedContacts: CertifiedContactsInitial
  planWording: PlanWording
  delegationRights: DelegationRightsSummary
  accountDeletionScheduledAt: string | null
  hasActiveSubscription: boolean
}) {
  const hasExtensionKey = extensionKeyInitial.hasKey
  const maskedKey = extensionKeyInitial.masked

  const [certifiedEmails, setCertifiedEmails] = useState<string[]>(
    certifiedContacts.certifiedEmails ?? []
  )
  const [certifiedPhones, setCertifiedPhones] = useState<string[]>(
    certifiedContacts.certifiedPhones ?? []
  )
  const [certifiedDomains, setCertifiedDomains] = useState<string[]>(
    certifiedContacts.certifiedDomains ?? []
  )
  const [savingCertified, setSavingCertified] = useState(false)
  const [savedCertified, setSavedCertified] = useState(false)
  const [certifiedError, setCertifiedError] = useState<string | null>(null)

  async function handleSaveCertifiedContacts() {
    setSavingCertified(true)
    setCertifiedError(null)
    try {
      let emailsPayload = certifiedEmails
      let phonesPayload = certifiedPhones
      if (!planWording.canCertifyMultipleEmails) {
        const ne = normalizeCertifiedEmailInput(certifiedEmails[0] ?? '')
        const np = normalizeCertifiedPhoneInput(certifiedPhones[0] ?? '')
        if (ne && !isValidCertifiedEmail(ne)) {
          setCertifiedError('Email invalide')
          return
        }
        if (np && !isValidCertifiedPhone(np)) {
          setCertifiedError('Numéro de téléphone invalide')
          return
        }
        emailsPayload = ne ? [ne] : []
        phonesPayload = np ? [np] : []
      }

      const res = await fetch('/api/user/certified-contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          certifiedEmails: emailsPayload,
          certifiedPhones: phonesPayload,
          certifiedDomains: planWording.canCertifyDomains ? certifiedDomains : [],
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setCertifiedError(data.error ?? 'Sauvegarde impossible')
        return
      }
      if (!planWording.canCertifyMultipleEmails) {
        setCertifiedEmails(emailsPayload)
        setCertifiedPhones(phonesPayload)
        setCertifiedDomains([])
      }
      setSavedCertified(true)
      window.setTimeout(() => setSavedCertified(false), 3000)
    } finally {
      setSavingCertified(false)
    }
  }


  const toggleTrack =
    'relative h-6 w-11 shrink-0 rounded-full bg-white/15 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[""] peer-checked:bg-bt-cyan peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bt-cyan/25 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--bt-navy)]'

  return (
    <div className="py-8 text-white/80">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-syne mb-8 text-4xl font-bold tracking-tight text-white drop-shadow-none">
          Paramètres
        </h1>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">
            Informations du profil
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              {user.image ? (
                <img src={user.image} alt="" className="h-16 w-16 rounded-full" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <span className="text-2xl text-white/80">
                    {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 transition hover:bg-white/5"
                >
                  Changer la photo
                </button>
                <p className="mt-1 text-xs text-white/45">JPG, PNG ou GIF. Max 1MB.</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-base font-semibold text-white/90">Nom</label>
              <input
                type="text"
                value={user.name || ''}
                readOnly
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                placeholder="Votre nom"
              />
              <p className="mt-1 text-xs text-white/45">Modification du nom à venir.</p>
            </div>

            <div>
              <label className="mb-2 block text-base font-semibold text-white/90">Email</label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
              <p className="mt-1 text-xs text-white/45">L&apos;email ne peut pas être modifié.</p>
            </div>
          </div>
        </div>

        <PasswordSection initialHasPassword={hasPassword} userEmail={user.email} />

        <section className="mb-6 rounded-xl border border-white/10 bg-[#0d1f3c] p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-syne text-sm font-semibold text-white">
                Mes droits de certification
              </h3>
              <p className="mt-1 text-xs text-white/40">
                Rôle :{' '}
                <span className="font-medium text-[#00d4ff]">{delegationRights.roleLabel}</span>
              </p>
            </div>
            {delegationRights.upgrade ? (
              <Link
                href={delegationRights.upgrade.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/10 px-3 py-1.5 text-xs font-semibold text-[#BDA76B] transition hover:bg-[#BDA76B]/20"
              >
                {delegationRights.upgrade.label}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>

          <ul className="space-y-2">
            {delegationRights.rights
              .filter((r) => r.canCertify || r.maxCount > 0)
              .map((right) => {
                const atLimit =
                  right.canCertify &&
                  right.maxCount !== -1 &&
                  right.currentCount >= right.maxCount
                return (
                  <li
                    key={right.subject}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-sm"
                  >
                    <span className="text-white/75">{right.label}</span>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        atLimit ? 'text-[#E05252]' : 'text-white/50'
                      }`}
                    >
                      {right.canCertify
                        ? `${right.currentCount}/${right.maxLabel}`
                        : 'Non disponible'}
                    </span>
                  </li>
                )
              })}
          </ul>

          {delegationRights.role === 'PERSONAL' ? (
            <p className="mt-3 text-xs text-white/35">
              Complétez votre vérification d&apos;identité pour certifier domaines et wallets.
            </p>
          ) : null}
        </section>

        <section className="mb-6 rounded-xl border border-white/10 bg-[#0d1f3c] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/10">
              <ShieldCheck className="h-4 w-4 text-[#00d4ff]" aria-hidden />
            </div>
            <div>
              <h3 className="font-syne text-sm font-semibold text-white">Mes coordonnées certifiées</h3>
              <p className="mt-0.5 text-xs text-white/40">
                Ces informations apparaissent sur votre badge et sont vérifiables par tous
              </p>
            </div>
          </div>

          {certifiedError ? (
            <p className="mb-4 text-sm text-[#E05252]" role="alert">
              {certifiedError}
            </p>
          ) : null}

          {planWording.canCertifyMultipleEmails ? (
            <ProCertifiedSection
              wording={planWording}
              certifiedEmails={certifiedEmails}
              certifiedPhones={certifiedPhones}
              certifiedDomains={certifiedDomains}
              setCertifiedEmails={setCertifiedEmails}
              setCertifiedPhones={setCertifiedPhones}
              setCertifiedDomains={setCertifiedDomains}
            />
          ) : (
            <SimpleCertifiedSection
              email={certifiedEmails[0] ?? ''}
              phone={certifiedPhones[0] ?? ''}
              onChangeEmail={(v) => setCertifiedEmails(v.trim() ? [v] : [])}
              onChangePhone={(v) => setCertifiedPhones(v.trim() ? [v] : [])}
            />
          )}

          <button
            type="button"
            onClick={() => void handleSaveCertifiedContacts()}
            disabled={savingCertified}
            className="inline-flex items-center gap-2 rounded-xl border border-[#00d4ff]/40 bg-[#00d4ff]/20 px-5 py-2.5 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingCertified ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden />
                Sauvegarder
              </>
            )}
          </button>

          {savedCertified ? (
            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3 w-3 shrink-0" aria-hidden />
              Coordonnées certifiées mises à jour
            </p>
          ) : null}
        </section>

        <section className="mb-6 rounded-xl border border-white/10 bg-[#0d1f3c] p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/10">
                <Chrome className="h-4 w-4 text-[#00d4ff]" aria-hidden />
              </div>
              <div>
                <h3 className="font-syne text-sm font-semibold text-white">Extension Chrome TrustScan</h3>
                <p className="text-xs text-white/40">Clé API et installation Gmail</p>
              </div>
            </div>
            <Link
              href="/dashboard/extension"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-4 py-2 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/25"
            >
              Gérer l&apos;extension
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </div>
          <p className="text-sm text-white/50">
            {hasExtensionKey
              ? `Clé active : ${maskedKey ?? 'masquée'}. Régénérez ou consultez les instructions sur la page dédiée.`
              : 'Générez votre clé API pour connecter l\'extension Chrome à votre compte BLOCKTRUST.'}
          </p>
        </section>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">
            Préférences de notification
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white/90">Emails de facturation</p>
                <p className="text-sm text-white/50">Recevoir des emails concernant vos factures</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className={toggleTrack} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white/90">Notifications produit</p>
                <p className="text-sm text-white/50">Recevoir des mises à jour sur les nouvelles fonctionnalités</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className={toggleTrack} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white/90">Alertes de sécurité</p>
                <p className="text-sm text-white/50">Recevoir des alertes pour les activités suspectes</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className={toggleTrack} />
              </label>
            </div>
          </div>
          <p className="mt-4 text-xs text-white/45">
            Les préférences de notification sont des placeholders pour l&apos;instant.
          </p>
        </div>

        <AccountDeletionSection
          accountDeletionScheduledAt={accountDeletionScheduledAt}
          hasActiveSubscription={hasActiveSubscription}
        />

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-red-500/40">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">Session</h2>
          <p className="mb-4 text-sm text-white/55">Déconnexion sécurisée via votre compte BLOCKTRUST™.</p>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
