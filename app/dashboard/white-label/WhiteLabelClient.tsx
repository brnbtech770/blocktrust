'use client'

// app/dashboard/white-label/WhiteLabelClient.tsx
// Client UI : clé API, personnalisation, webhook, doc rapide.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Code2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Globe,
  Webhook,
  AlertTriangle,
  Send,
  ExternalLink,
  Palette,
} from 'lucide-react'

type ConfigDto = {
  id: string
  companyName: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  apiKeyMasked: string
  webhookUrl: string | null
  webhookConfigured: boolean
  canEmbed: boolean
  canVerify: boolean
  canIssue: boolean
  apiCallsCount: number
  apiCallsLimit: number
  createdAt: string
  updatedAt: string
}

function CopyButton({ value, label = 'Copier' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/10"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié' : label}
    </button>
  )
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-bt-cyan/30 bg-bt-cyan/10 p-2 text-bt-cyan">
          {icon}
        </div>
        <div>
          <h2 className="font-syne text-lg font-bold text-white">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-white/60">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function WhiteLabelClient() {
  const [config, setConfig] = useState<ConfigDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [savingBranding, setSavingBranding] = useState(false)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#00d4ff')
  const [secondaryColor, setSecondaryColor] = useState('#BDA76B')
  const [logoUrl, setLogoUrl] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')

  const widgetPreviewRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    fetch('/api/whitelabel/config')
      .then((r) => r.json())
      .then((data) => {
        if (data?.config) {
          setConfig(data.config)
          setCompanyName(data.config.companyName ?? '')
          setPrimaryColor(data.config.primaryColor ?? '#00d4ff')
          setSecondaryColor(data.config.secondaryColor ?? '#BDA76B')
          setLogoUrl(data.config.logoUrl ?? '')
          setWebhookUrl(data.config.webhookUrl ?? '')
        } else {
          setError(data?.error ?? 'Erreur')
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const usagePct = useMemo(() => {
    if (!config || config.apiCallsLimit === 0) return 0
    return Math.min(100, Math.round((config.apiCallsCount / config.apiCallsLimit) * 100))
  }, [config])

  async function handleRotateKey() {
    setRotating(true)
    setError(null)
    try {
      const res = await fetch('/api/whitelabel/regenerate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'rotate_failed')
      setRevealedKey(data.apiKey)
      setShowKey(true)
      setConfig((c) => (c ? { ...c, apiKeyMasked: data.apiKeyMasked } : c))
      setConfirmRotate(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'rotate_failed')
    } finally {
      setRotating(false)
    }
  }

  async function handleSaveBranding() {
    setSavingBranding(true)
    setError(null)
    try {
      const res = await fetch('/api/whitelabel/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          primaryColor,
          secondaryColor,
          logoUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'save_failed')
      setConfig(data.config)
      // Forcer le refresh du preview du widget
      if (widgetPreviewRef.current) {
        widgetPreviewRef.current.src = `${widgetPreviewRef.current.src.split('?')[0]}?t=${Date.now()}`
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setSavingBranding(false)
    }
  }

  async function handleSaveWebhook() {
    setSavingWebhook(true)
    setError(null)
    setWebhookTestResult(null)
    try {
      const res = await fetch('/api/whitelabel/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'save_failed')
      setConfig(data.config)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save_failed')
    } finally {
      setSavingWebhook(false)
    }
  }

  async function handleTestWebhook() {
    setTestingWebhook(true)
    setWebhookTestResult(null)
    try {
      const res = await fetch('/api/whitelabel/test-webhook', { method: 'POST' })
      const data = await res.json()
      if (data.ok) setWebhookTestResult(`Webhook livré (HTTP ${data.status ?? 200})`)
      else setWebhookTestResult(`Échec : ${data.error ?? 'unknown'}`)
    } catch (e: unknown) {
      setWebhookTestResult(`Échec : ${e instanceof Error ? e.message : 'error'}`)
    } finally {
      setTestingWebhook(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-white/60">Chargement…</div>
      </div>
    )
  }
  if (!config) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-red-300">
          Impossible de charger la configuration : {error ?? 'erreur'}
        </div>
      </div>
    )
  }

  const apiKeyDisplay = revealedKey
    ? showKey
      ? revealedKey
      : config.apiKeyMasked
    : config.apiKeyMasked

  const sampleCertId = 'YOUR_CERTIFICATE_ID'
  const curlSnippet = `curl -H "X-API-Key: ${revealedKey ?? 'YOUR_API_KEY'}" \\
  https://blocktrust.tech/api/public/verify/${sampleCertId}`
  const jsSnippet = `const res = await fetch(
  'https://blocktrust.tech/api/public/verify/${sampleCertId}',
  { headers: { 'X-API-Key': '${revealedKey ?? 'YOUR_API_KEY'}' } }
)
const data = await res.json()
console.log(data.verdict, data.entity.name)`

  const previewSrc = `/api/public/widget/${sampleCertId}?apiKey=${encodeURIComponent(
    revealedKey ?? 'preview'
  )}&primaryColor=${encodeURIComponent(primaryColor)}&secondaryColor=${encodeURIComponent(
    secondaryColor
  )}&size=160`

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex items-center gap-3">
        <Code2 className="h-7 w-7 text-bt-cyan" />
        <h1 className="font-syne text-2xl font-bold text-white sm:text-3xl">
          Marque Blanche & API
        </h1>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* SECTION 1 — CLÉ API */}
        <Section
          icon={<Code2 className="h-4 w-4" />}
          title="Clé API"
          description="Authentifiez vos appels via le header X-API-Key."
        >
          <div className="rounded-lg border border-white/10 bg-bt-navy/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <code className="flex-1 break-all font-mono text-xs text-bt-cyan sm:text-sm">
                {apiKeyDisplay}
              </code>
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                disabled={!revealedKey}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showKey ? 'Masquer' : 'Afficher'}
              </button>
              {revealedKey && <CopyButton value={revealedKey} />}
            </div>
            {!revealedKey && (
              <p className="mt-3 text-xs text-white/50">
                Pour des raisons de sécurité, BLOCKTRUST™ ne ré-affiche jamais une clé déjà
                générée. Régénérez la clé pour la lire en clair (l&apos;ancienne sera invalidée).
              </p>
            )}
            {revealedKey && (
              <p className="mt-3 flex items-start gap-2 text-xs text-amber-300/90">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                Cette clé n&apos;est affichée qu&apos;une seule fois. Copiez-la et stockez-la en lieu sûr.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!confirmRotate ? (
              <button
                type="button"
                onClick={() => setConfirmRotate(true)}
                className="inline-flex items-center gap-2 rounded-md border border-bt-cyan/30 bg-bt-cyan/10 px-3 py-1.5 text-sm text-bt-cyan hover:bg-bt-cyan/20"
              >
                <RefreshCw className="h-4 w-4" />
                Régénérer la clé
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-amber-300">
                  Régénérer va invalider l&apos;ancienne clé. Confirmer ?
                </span>
                <button
                  type="button"
                  onClick={handleRotateKey}
                  disabled={rotating}
                  className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-bt-navy hover:bg-amber-300 disabled:opacity-50"
                >
                  {rotating ? 'Régénération…' : 'Confirmer'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRotate(false)}
                  className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-white/70">
                Appels API ce mois :{' '}
                <strong className="text-white">{config.apiCallsCount.toLocaleString('fr-FR')}</strong>{' '}
                / {config.apiCallsLimit.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-white/50">{usagePct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-bt-cyan transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        </Section>

        {/* SECTION 2 — PERSONNALISATION */}
        <Section
          icon={<Palette className="h-4 w-4" />}
          title="Personnalisation"
          description="Couleurs et nom appliqués au widget embeddable."
        >
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/60">
                  Nom commercial
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-bt-navy/60 px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan"
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/60">
                    Couleur primaire
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border border-white/15 bg-transparent"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-md border border-white/15 bg-bt-navy/60 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-bt-cyan"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-white/60">
                    Couleur secondaire
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border border-white/15 bg-transparent"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 rounded-md border border-white/15 bg-bt-navy/60 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-bt-cyan"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-white/60">
                  URL du logo (optionnel)
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://votre-site.com/logo.png"
                  className="mt-1.5 w-full rounded-md border border-white/15 bg-bt-navy/60 px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="rounded-md bg-bt-cyan px-4 py-2 text-sm font-medium text-bt-navy transition-colors hover:bg-bt-cyan/90 disabled:opacity-50"
              >
                {savingBranding ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-bt-navy/40 p-4">
              <span className="text-xs uppercase tracking-wider text-white/50">Aperçu</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={widgetPreviewRef}
                src={previewSrc}
                alt="Aperçu widget"
                width={160}
                height={160}
                className="rounded-md"
              />
              <span className="font-mono text-[10px] text-white/40">
                Widget 160×160 SVG
              </span>
            </div>
          </div>
        </Section>

        {/* SECTION 3 — WEBHOOK */}
        <Section
          icon={<Webhook className="h-4 w-4" />}
          title="Webhook sortant"
          description="BLOCKTRUST™ pousse les événements signés HMAC-SHA256 vers votre URL."
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-white/60">
                URL de webhook
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://votre-api.example.com/webhooks/blocktrust"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-bt-navy/60 px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan"
              />
            </div>
            <p className="text-xs text-white/55">
              Le secret HMAC est généré automatiquement. La signature est envoyée dans le
              header <code className="rounded bg-white/10 px-1 py-0.5 font-mono">X-BlockTrust-Signature</code>.
              {!config.webhookConfigured && (
                <span className="ml-1 text-amber-300">Aucun secret configuré pour le moment.</span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveWebhook}
                disabled={savingWebhook}
                className="rounded-md bg-bt-cyan px-4 py-2 text-sm font-medium text-bt-navy hover:bg-bt-cyan/90 disabled:opacity-50"
              >
                {savingWebhook ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testingWebhook || !config.webhookUrl}
                className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {testingWebhook ? 'Test en cours…' : 'Tester le webhook'}
              </button>
              {webhookTestResult && (
                <span
                  className={`text-xs ${
                    webhookTestResult.startsWith('Webhook livré') ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {webhookTestResult}
                </span>
              )}
            </div>
          </div>
        </Section>

        {/* SECTION 4 — DOC RAPIDE */}
        <Section
          icon={<Globe className="h-4 w-4" />}
          title="Documentation rapide"
          description="Snippets prêts à coller. Remplacez YOUR_CERTIFICATE_ID par un id réel."
        >
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-white/60">
                  cURL
                </span>
                <CopyButton value={curlSnippet} />
              </div>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-bt-navy/60 p-3 font-mono text-xs leading-relaxed text-white/90">
                {curlSnippet}
              </pre>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-white/60">
                  JavaScript / Node
                </span>
                <CopyButton value={jsSnippet} />
              </div>
              <pre className="overflow-x-auto rounded-lg border border-white/10 bg-bt-navy/60 p-3 font-mono text-xs leading-relaxed text-white/90">
                {jsSnippet}
              </pre>
            </div>
            <a
              href="/how-to#api"
              className="inline-flex items-center gap-1.5 text-sm text-bt-cyan hover:underline"
            >
              Documentation complète
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </Section>
      </div>
    </div>
  )
}
