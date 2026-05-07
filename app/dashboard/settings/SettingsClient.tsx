'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Chrome, Copy } from 'lucide-react'
import SignOutButton from '@/app/components/SignOutButton'

export type SettingsClientUser = {
  email: string
  name: string | null
  image: string | null
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

export default function SettingsClient({
  user,
  extensionKeyInitial,
}: {
  user: SettingsClientUser
  extensionKeyInitial: ExtensionKeyInitial
}) {
  const [hasExtensionKey, setHasExtensionKey] = useState(extensionKeyInitial.hasKey)
  const [maskedKey, setMaskedKey] = useState<string | null>(extensionKeyInitial.masked)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [keyLoading, setKeyLoading] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)

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
          <p className="mb-4 text-sm text-white/55">Déconnexion sécurisée via votre compte BlockTrust.</p>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
