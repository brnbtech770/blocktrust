'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Chrome,
  Copy,
  Globe,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
} from 'lucide-react'
import SignOutButton from '@/app/components/SignOutButton'
import Link from 'next/link'
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

type ApiKeyResponse = {
  hasKey?: boolean
  apiKey?: string | null
  masked?: string | null
  message?: string
  error?: string
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

export default function SettingsClient({
  user,
  extensionKeyInitial,
  certifiedContacts,
  planWording,
  delegationRights,
}: {
  user: SettingsClientUser
  extensionKeyInitial: ExtensionKeyInitial
  certifiedContacts: CertifiedContactsInitial
  planWording: PlanWording
  delegationRights: DelegationRightsSummary
}) {
  const [hasExtensionKey, setHasExtensionKey] = useState(extensionKeyInitial.hasKey)
  const [maskedKey, setMaskedKey] = useState<string | null>(extensionKeyInitial.masked)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 1500)
    } catch {
      setKeyError('Copie impossible — copiez manuellement.')
    }
  }

  const handleGenerateKey = async () => {
    setKeyError(null)
    setKeyLoading(true)
    try {
      const res = await fetch('/api/extension/api-key', { method: 'GET', credentials: 'include' })
      const data = (await res.json()) as ApiKeyResponse
      if (!res.ok) {
        setKeyError(data.message ?? data.error ?? 'Erreur lors de la génération.')
        return
      }
      if (data.apiKey) {
        setNewApiKey(data.apiKey)
        setHasExtensionKey(true)
        setMaskedKey(data.masked ?? null)
        return
      }
      if (data.hasKey) {
        setHasExtensionKey(true)
        setMaskedKey(data.masked ?? null)
        setKeyError('Une clé existe déjà pour ce compte.')
      }
    } finally {
      setKeyLoading(false)
    }
  }

  const handleRegenerateKey = async () => {
    if (
      !window.confirm(
        'Régénérer la clé ? L’ancienne clé sera révoquée immédiatement et l’extension devra utiliser la nouvelle.',
      )
    ) {
      return
    }
    setKeyError(null)
    setNewApiKey(null)
    setKeyLoading(true)
    try {
      const res = await fetch('/api/extension/api-key', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      })
      const data = (await res.json()) as ApiKeyResponse
      if (!res.ok) {
        setKeyError(data.message ?? data.error ?? 'Erreur lors de la régénération.')
        return
      }
      if (data.apiKey) {
        setNewApiKey(data.apiKey)
        setHasExtensionKey(true)
        setMaskedKey(data.masked ?? null)
      }
    } finally {
      setKeyLoading(false)
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
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/10">
              <Chrome className="h-4 w-4 text-[#00d4ff]" aria-hidden />
            </div>
            <div>
              <h3 className="font-syne text-sm font-semibold text-white">Extension Chrome TrustScan</h3>
              <p className="text-xs text-white/40">Protégez automatiquement vos emails</p>
            </div>
          </div>

          {keyError ? (
            <p className="mb-3 text-sm text-[#E05252]" role="alert">
              {keyError}
            </p>
          ) : null}

          {!hasExtensionKey && (
            <div>
              <p className="mb-4 text-sm text-white/50">
                Générez votre clé API pour connecter l&apos;extension Chrome à votre compte BLOCKTRUST.
              </p>
              <button
                type="button"
                onClick={handleGenerateKey}
                disabled={keyLoading}
                className="rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/20 px-4 py-2 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {keyLoading ? 'Génération…' : 'Générer ma clé API'}
              </button>
            </div>
          )}

          {newApiKey ? (
            <div className="mt-4 rounded-lg bg-black/20 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Copiez cette clé maintenant — elle ne sera plus affichée intégralement.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-xs text-white/80">{newApiKey}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(newApiKey)}
                  className="shrink-0 text-[#00d4ff] transition hover:text-white"
                  aria-label="Copier la clé"
                >
                  {copyDone ? (
                    <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {hasExtensionKey && !newApiKey ? (
            <div>
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-black/20 p-3">
                <code className="flex-1 font-mono text-xs text-white/40">
                  {maskedKey ?? 'Clé active (masquée)'}
                </code>
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Active
                </span>
              </div>
              <p className="mb-3 text-xs text-white/30">Extension Chrome connectée à votre compte.</p>
              <button
                type="button"
                onClick={handleRegenerateKey}
                disabled={keyLoading}
                className="text-xs text-white/30 transition hover:text-white/60 disabled:opacity-50"
              >
                {keyLoading ? 'Régénération…' : 'Régénérer la clé (révoque l’ancienne)'}
              </button>
            </div>
          ) : null}

          <div className="mt-4 border-t border-white/5 pt-4">
            <p className="text-xs text-white/30">
              Extension Chrome — disponible prochainement sur le Chrome Web Store.
            </p>
          </div>
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

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-red-500/40">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">Session</h2>
          <p className="mb-4 text-sm text-white/55">Déconnexion sécurisée via votre compte BLOCKTRUST™.</p>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
