// app/dashboard/badge/[id]/BadgeDashboardClient.tsx
// Page client — badge, embed, QR rotatif, IDs
// ============================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { truncateVerificationPublicId } from '@/lib/truncate-public-id'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'
import { isNotAnchored } from '@/lib/plan-features'
import { BlockchainUpgradePrompt } from '@/app/components/ui/BlockchainUpgradePrompt'
import { Copy, Download, ExternalLink, Check, Clock, Mail, Lock, History, RefreshCw } from 'lucide-react'
import { TTL_PRESETS, type VerifyTokenListItem } from '@/lib/certificate-verify-token-constants'

interface BadgeData {
  id: string
  publicId: string | null
  status: string
  blockchainStatus?: string | null
  entity: {
    id: string
    entityType: string
    legalName: string | null
    tradeName: string | null
    firstName: string | null
    lastName: string | null
    email: string
    siret: string | null
  }
  trustScore?: {
    score: number
    level: string
  } | null
  verificationCount: number
  lastVerifiedAt: string | null
}

type CopyTarget = 'embed' | 'script' | 'secure' | 'link' | 'permanent'

type RotatingLink = {
  url: string
  expiresAt: string
}

type BadgeDashboardClientProps = {
  isAdmin: boolean
  planExpired?: boolean
}

export default function BadgeDashboardClient({ isAdmin, planExpired = false }: BadgeDashboardClientProps) {
  const params = useParams()
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [embedCopied, setEmbedCopied] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
  const [secureLinkCopied, setSecureLinkCopied] = useState(false)
  const [permanentLinkCopied, setPermanentLinkCopied] = useState(false)
  const [verifyLink, setVerifyLink] = useState<RotatingLink | null>(null)
  const [generating, setGenerating] = useState(false)
  const [ttlHours, setTtlHours] = useState<number>(24)
  const [tokenHistory, setTokenHistory] = useState<VerifyTokenListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchTokenHistory = useCallback(async (certificateId: string) => {
    setHistoryLoading(true)
    try {
      const res = await fetch(
        `/api/verify/tokens?certificateId=${encodeURIComponent(certificateId)}`,
        { credentials: 'include' },
      )
      if (!res.ok) return []
      const data = (await res.json()) as { tokens?: VerifyTokenListItem[] }
      const tokens = Array.isArray(data.tokens) ? data.tokens : []
      setTokenHistory(tokens)
      return tokens
    } catch {
      return []
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const generateRotatingLink = useCallback(
    async (certificateId: string, hours: number): Promise<RotatingLink | null> => {
      setGenerating(true)
      try {
        const res = await fetch('/api/verify/generate-link', {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            certificateId,
            ttlHours: hours,
          }),
        })
        const data = (await res.json()) as {
          verifyUrl?: string
          expiresAt?: string
          message?: string
        }
        if (!res.ok || !data.verifyUrl || !data.expiresAt) {
          alert(
            typeof data.message === 'string'
              ? data.message
              : 'Impossible de générer le lien de vérification.',
          )
          return null
        }
        const link = { url: data.verifyUrl, expiresAt: data.expiresAt }
        setVerifyLink(link)
        await fetchTokenHistory(certificateId)
        return link
      } catch {
        alert('Erreur réseau.')
        return null
      } finally {
        setGenerating(false)
      }
    },
    [fetchTokenHistory],
  )

  const ensureRotatingLink = useCallback(
    async (certificateId: string, hours: number) => {
      const tokens = await fetchTokenHistory(certificateId)
      const active = tokens.find((t) => t.status === 'active')
      if (active) {
        const link = { url: active.verifyUrl, expiresAt: active.expiresAt }
        setVerifyLink(link)
        return link
      }
      return generateRotatingLink(certificateId, hours)
    },
    [fetchTokenHistory, generateRotatingLink],
  )

  const fetchBadge = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/certificates`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }

      const certificates = await response.json()
      const certificate = certificates.find(
        (c: { id: string; publicId: string | null }) =>
          c.id === params.id || c.publicId === params.id,
      )

      if (!certificate) {
        throw new Error('Certificat non trouvé')
      }

      try {
        const trustScoreResponse = await fetch(
          `/api/entities/${certificate.entity.id}/trust-score`,
          { credentials: 'include' },
        )
        if (trustScoreResponse.ok) {
          const trustScore = await trustScoreResponse.json()
          certificate.trustScore = trustScore
        }
      } catch (err) {
        console.error('Error fetching trust score:', err)
      }

      setBadgeData(certificate)
      void ensureRotatingLink(certificate.id, 24)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [params.id, ensureRotatingLink])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/')
      return
    }
    if (sessionStatus === 'authenticated') {
      void fetchBadge()
    }
  }, [sessionStatus, router, fetchBadge])

  const getEmbedCode = () => {
    if (!badgeData) return ''
    const badgeId = badgeData.publicId || badgeData.id
    const baseUrl = window.location.origin
    return `<a href="${baseUrl}/verify?certId=${encodeURIComponent(badgeId)}" target="_blank" rel="noopener noreferrer" title="Vérifier sur BLOCKTRUST™">
  <img src="${baseUrl}/api/badge/${badgeId}" alt="Badge BLOCKTRUST™ vérifié" width="150" height="200" />
</a>`
  }

  const getScriptCode = () => {
    if (!badgeData) return ''
    const widgetCertKey = badgeData.publicId?.trim() || badgeData.id
    const baseUrl = window.location.origin
    return `<!-- BLOCKTRUST™ Badge Widget -->
<div id="blocktrust-badge"
  data-certificate="${widgetCertKey}"
  data-size="md">
</div>
<script src="${baseUrl}/api/widget.js" async defer><\/script>`
  }

  const handleCopy = async (text: string, target: CopyTarget) => {
    const ok = await copyToClipboard(text)
    if (!ok) {
      alert('Erreur lors de la copie')
      return false
    }
    if (target === 'embed') {
      setEmbedCopied(true)
      setTimeout(() => setEmbedCopied(false), 2000)
    } else if (target === 'script') {
      setScriptCopied(true)
      setTimeout(() => setScriptCopied(false), 2000)
    } else if (target === 'secure') {
      setSecureLinkCopied(true)
      setTimeout(() => setSecureLinkCopied(false), 2000)
    } else if (target === 'permanent') {
      setPermanentLinkCopied(true)
      setTimeout(() => setPermanentLinkCopied(false), 2000)
    }
    return true
  }

  const handleCopyEmbed = () => void handleCopy(getEmbedCode(), 'embed')

  const handleCopyScript = () => void handleCopy(getScriptCode(), 'script')

  const handleCopyRotatingLink = async () => {
    if (!badgeData) return
    let link = verifyLink
    if (!link) {
      link = await generateRotatingLink(badgeData.id, ttlHours)
    }
    if (link) {
      await handleCopy(link.url, 'secure')
    }
  }

  const handleRegenerateLink = async () => {
    if (!badgeData) return
    const link = await generateRotatingLink(badgeData.id, ttlHours)
    if (link) {
      await handleCopy(link.url, 'secure')
    }
  }

  const handleDownloadRotatingQR = async () => {
    if (!verifyLink) return
    const qrUrl = `/api/verify/link-qr?url=${encodeURIComponent(verifyLink.url)}`
    try {
      const res = await fetch(qrUrl, { credentials: 'include' })
      if (!res.ok) throw new Error('QR indisponible')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `blocktrust-qr-rotatif-${badgeData?.publicId ?? badgeData?.id ?? 'badge'}.png`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)
    } catch {
      alert('Impossible de télécharger le QR code.')
    }
  }

  const formatTokenStatus = (status: VerifyTokenListItem['status']): string => {
    if (status === 'active') return 'Actif'
    if (status === 'used') return 'Consulté'
    return 'Expiré'
  }

  const statusBadgeClass = (status: VerifyTokenListItem['status']): string => {
    if (status === 'active') return 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]'
    if (status === 'used') return 'border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff]'
    return 'border-white/10 bg-white/5 text-white/40'
  }

  if (planExpired) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/certificates"
          className="mb-4 inline-block text-sm text-bt-cyan transition hover:text-bt-cyan/90"
        >
          ← Retour aux certificats
        </Link>
        <div className="rounded-2xl border border-[#BDA76B]/40 bg-[#0a1628] p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00d4ff]/30 bg-[#00d4ff]/10">
            <Lock className="h-6 w-6 text-[#00d4ff]" aria-hidden />
          </div>
          <h1 className="font-syne text-2xl font-bold text-white">
            Votre période découverte de 30 jours est terminée
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
            L&apos;aperçu de votre badge est désactivé. Vos données restent conservées. Activez votre
            certification dès <span className="font-semibold text-[#BDA76B]">2,99€/mois</span> pour
            réactiver votre badge et l&apos;ancrer sur la blockchain.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00d4ff] px-6 py-3 font-sans font-semibold text-[#0a1628] transition-all hover:bg-[#00d4ff]/90"
          >
            Activer ma certification
          </Link>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-white/80">Chargement...</div>
      </div>
    )
  }

  if (error || !badgeData) {
    return (
      <div className="rounded-xl border border-[#E05252]/30 bg-[#E05252]/10 p-6">
        <p className="text-sm text-[#E05252]">{error || 'Badge non trouvé'}</p>
      </div>
    )
  }

  const badgeId = badgeData.publicId || badgeData.id
  const verifyIdLabel = truncateVerificationPublicId(badgeData.publicId)
  const publicVerifyHref = buildPublicVerifyUrl(badgeId)
  const notAnchored = isNotAnchored(badgeData.blockchainStatus)
  const rotatingQrSrc = verifyLink
    ? `/api/verify/link-qr?url=${encodeURIComponent(verifyLink.url)}`
    : null

  return (
    <>
      <div className="mb-8">
        <Link
          href="/dashboard/certificates"
          className="mb-4 inline-block text-sm text-bt-cyan transition hover:text-bt-cyan/90"
        >
          ← Retour aux certificats
        </Link>
        <h1 className="font-syne mb-6 text-4xl font-bold tracking-tight text-white">Mon Badge</h1>

        <div className={`grid gap-4 ${isAdmin ? 'sm:grid-cols-2' : ''}`}>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-2 text-xs uppercase tracking-widest text-white/40">ID de vérification</p>
            <p className="truncate font-mono text-sm text-white/70">{verifyIdLabel}</p>
            <p className="mt-1 text-xs text-white/30">
              Identifiant public de votre badge (widget site)
            </p>
          </div>

          {isAdmin ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-white/20">ID interne (admin)</p>
              <p className="break-all font-mono text-xs text-white/30">{badgeData.id}</p>
            </div>
          ) : null}
        </div>
      </div>

      {notAnchored ? (
        <div className="mb-6">
          <BlockchainUpgradePrompt />
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Aperçu du badge</h2>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#060d1a] p-6">
              <Image
                src={`/api/badge/${badgeId}?size=md`}
                alt="Aperçu du badge BLOCKTRUST"
                width={320}
                height={420}
                unoptimized
                className="h-auto max-w-full"
                style={{ maxWidth: '320px' }}
              />
            </div>
            <p className="mt-4 text-center font-mono text-xs text-white/40">{verifyIdLabel}</p>
            {notAnchored ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#BDA76B]/30 bg-[#BDA76B]/10 px-3 py-1 text-center text-xs font-medium text-[#BDA76B]">
                Badge preview — non certifié sur la blockchain
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Intégration</h2>

          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Code embed HTML</p>
          <div className="mb-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <pre className="overflow-auto text-xs text-white/70">
              <code>{getEmbedCode()}</code>
            </pre>
          </div>
          <button
            type="button"
            onClick={handleCopyEmbed}
            className="mb-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-bt-cyan transition hover:bg-bt-cyan/25"
          >
            {embedCopied ? (
              <>
                <Check size={18} aria-hidden />
                Copié !
              </>
            ) : (
              <>
                <Copy size={18} aria-hidden />
                Copier le code HTML
              </>
            )}
          </button>

          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Code Script (recommandé)</p>
          <div className="mb-3 rounded-lg border border-white/10 bg-black/30 p-4">
            <pre className="overflow-auto text-xs text-white/70">
              <code>{getScriptCode()}</code>
            </pre>
          </div>
          <button
            type="button"
            onClick={handleCopyScript}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/15 px-4 py-2 text-[#BDA76B] transition hover:bg-[#BDA76B]/25"
          >
            {scriptCopied ? (
              <>
                <Check size={18} aria-hidden />
                Copié !
              </>
            ) : (
              <>
                <Copy size={18} aria-hidden />
                Copier le code script
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-[#0d1f3c] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/10">
            <Mail className="h-4 w-4 text-[#00d4ff]" aria-hidden />
          </div>
          <h2 className="font-syne text-lg font-semibold text-white">
            Comment ajouter mon badge à ma signature Gmail
          </h2>
        </div>
        <ol className="space-y-3 text-sm text-white/70">
          <li className="flex gap-3">
            <span className="font-mono text-[#00d4ff]">1.</span>
            <span>
              Copiez le <strong className="text-white">code HTML du badge</strong> ci-dessus
              (section Intégration).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[#00d4ff]">2.</span>
            <span>
              Dans Gmail : <strong className="text-white">Paramètres → Voir tous les paramètres →
              Général → Signature</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[#00d4ff]">3.</span>
            <span>
              Cliquez sur l&apos;icône <strong className="text-white">image</strong> dans l&apos;éditeur
              de signature.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[#00d4ff]">4.</span>
            <span>
              Collez votre <strong className="text-white">lien de vérification rotatif</strong>
              {verifyLink ? (
                <>
                  {' '}
                  <code className="break-all rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-[#00d4ff]">
                    {verifyLink.url}
                  </code>
                </>
              ) : (
                ' (section QR Code ci-dessous)'
              )}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-[#00d4ff]">5.</span>
            <span>Enregistrez — vos emails sortants afficheront votre identité certifiée BLOCKTRUST™.</span>
          </li>
        </ol>
        <button
          type="button"
          onClick={handleCopyEmbed}
          className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-4 py-2 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/25"
        >
          {embedCopied ? (
            <>
              <Check size={16} aria-hidden />
              Code HTML copié
            </>
          ) : (
            <>
              <Copy size={16} aria-hidden />
              Copier le code HTML du badge
            </>
          )}
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-[#0d1f3c] p-6">
        <h2 className="mb-2 font-syne text-lg font-semibold text-white">
          QR Code & Vérification
        </h2>
        <p className="mb-6 text-xs leading-relaxed text-white/45">
          Partagez un lien rotatif (24 h par défaut) — plus sûr qu&apos;un lien permanent pour vos
          échanges ponctuels.
        </p>

        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <div className="mx-auto shrink-0 sm:mx-0">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-white p-4">
              {rotatingQrSrc && !generating ? (
                <Image
                  src={rotatingQrSrc}
                  alt="QR code de vérification rotatif"
                  width={168}
                  height={168}
                  unoptimized
                  className="h-full w-full"
                />
              ) : (
                <p className="text-center text-xs text-navy/60">Génération du QR…</p>
              )}
            </div>
            {verifyLink ? (
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-white/40">
                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                Expire le{' '}
                {new Date(verifyLink.expiresAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            ) : null}
          </div>

          <div className="w-full flex-1 space-y-4">
            <div className="flex flex-wrap gap-2">
              {TTL_PRESETS.map((preset) => (
                <button
                  key={preset.hours}
                  type="button"
                  onClick={() => setTtlHours(preset.hours)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    ttlHours === preset.hours
                      ? 'border-[#BDA76B]/50 bg-[#BDA76B]/15 text-[#BDA76B]'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleCopyRotatingLink()}
              disabled={generating}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#00d4ff]/40 bg-[#00d4ff]/15 py-3 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {secureLinkCopied ? (
                <>
                  <Check className="h-4 w-4 shrink-0" aria-hidden />
                  Lien copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 shrink-0" aria-hidden />
                  {generating ? 'Génération…' : 'Copier le lien'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleRegenerateLink()}
              disabled={generating}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#BDA76B]/30 bg-[#BDA76B]/10 py-2.5 text-sm font-semibold text-[#BDA76B] transition hover:bg-[#BDA76B]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              {generating ? 'Génération…' : 'Générer un nouveau lien'}
            </button>

            {verifyLink ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <code className="block break-all font-mono text-xs text-white/55">{verifyLink.url}</code>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleDownloadRotatingQR()}
                disabled={!verifyLink || generating}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/20 px-4 py-2 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={18} aria-hidden />
                Télécharger le QR (PNG)
              </button>
              {verifyLink ? (
                <a
                  href={verifyLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-bt-cyan hover:text-bt-cyan/90"
                >
                  Ouvrir le lien <ExternalLink size={12} aria-hidden />
                </a>
              ) : null}
            </div>

            <div className="border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => void handleCopy(publicVerifyHref, 'permanent')}
                className="cursor-pointer text-xs text-white/35 underline-offset-2 transition hover:text-white/55 hover:underline"
              >
                {permanentLinkCopied ? 'Lien permanent copié' : 'Lien permanent (avancé)'}
              </button>
              <p className="mt-1 text-[10px] leading-relaxed text-white/25">
                Ne partagez le lien permanent que si vous acceptez qu&apos;il reste valide
                indéfiniment. Le widget site utilise toujours l&apos;ID permanent.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-white/40" aria-hidden />
                <p className="text-sm font-medium text-white">Historique des liens rotatifs</p>
              </div>
              {historyLoading ? (
                <p className="text-xs text-white/40">Chargement…</p>
              ) : tokenHistory.length === 0 ? (
                <p className="text-xs text-white/30">Aucun lien rotatif généré.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {tokenHistory.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-white/50">{item.tokenPreview}</p>
                        <p className="text-[10px] text-white/30">
                          Créé le{' '}
                          {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {' · '}
                          expire le{' '}
                          {new Date(item.expiresAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(item.status)}`}
                      >
                        {formatTokenStatus(item.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
        <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Statistiques</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-base font-medium text-white/60">Nombre de vérifications</p>
            <p className="text-4xl font-bold tracking-tight text-white">{badgeData.verificationCount || 0}</p>
          </div>
          <div>
            <p className="mb-2 text-base font-medium text-white/60">Dernière vérification</p>
            <p className="text-lg text-white">
              {badgeData.lastVerifiedAt
                ? new Date(badgeData.lastVerifiedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Jamais'}
            </p>
          </div>
          <div>
            <p className="mb-2 text-base font-medium text-white/60">Lien actif</p>
            {verifyLink ? (
              <a
                href={verifyLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-bt-cyan hover:text-bt-cyan/90"
              >
                Ouvrir <ExternalLink size={14} aria-hidden />
              </a>
            ) : (
              <p className="text-sm text-white/40">—</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
