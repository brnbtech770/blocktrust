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
import { Copy, Download, ExternalLink, Check, Clock, Lock, QrCode, Link2, Lightbulb, ChevronDown } from 'lucide-react'
import { TTL_PRESETS, type VerifyTokenListItem } from '@/lib/certificate-verify-token-constants'

interface BadgeData {
  id: string
  publicId: string | null
  status: string
  blockchainStatus?: string | null
  issuedAt?: string | null
  polygonTxHash?: string | null
  polygonBlock?: number | null
  polygonExplorerUrl?: string | null
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

type CopyTarget = 'embed' | 'script' | 'secure' | 'link' | 'permanent' | 'email'

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
  const [emailSnippetCopied, setEmailSnippetCopied] = useState(false)
  const [verifyLink, setVerifyLink] = useState<RotatingLink | null>(null)
  const [generating, setGenerating] = useState(false)
  const [ttlHours, setTtlHours] = useState<number>(24)
  const [tokenHistory, setTokenHistory] = useState<VerifyTokenListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showQr, setShowQr] = useState(false)

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

  useEffect(() => {
    if (loading) return
    if (typeof window === 'undefined') return
    if (window.location.hash === '#partage') {
      document.getElementById('partage')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading])

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
    } else if (target === 'email') {
      setEmailSnippetCopied(true)
      setTimeout(() => setEmailSnippetCopied(false), 2000)
    }
    return true
  }

  const handleCopyEmbed = () => void handleCopy(getEmbedCode(), 'embed')

  const handleCopyScript = () => void handleCopy(getScriptCode(), 'script')

  const handleCopyRotatingLink = async () => {
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

  const ttlDurationLabel = (createdAt: string, expiresAt: string): string => {
    const hours = Math.round(
      (new Date(expiresAt).getTime() - new Date(createdAt).getTime()) / 3_600_000,
    )
    const preset = TTL_PRESETS.find((p) => p.hours === hours)
    return preset?.label ?? `${hours} h`
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
  const certStatusLabel =
    badgeData.status === 'EXPIRED'
      ? 'Expiré'
      : badgeData.status === 'REVOKED'
        ? 'Révoqué'
        : badgeData.status === 'PENDING'
          ? "En attente d'activation"
          : 'Actif'
  const trustScore = badgeData.trustScore?.score ?? 0
  const expiresLabel = verifyLink
    ? new Date(verifyLink.expiresAt).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const issuedAtLabel = badgeData.issuedAt
    ? new Date(badgeData.issuedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'
  const emailSnippet = `<a href="${verifyLink?.url ?? publicVerifyHref}" target="_blank" rel="noopener noreferrer" title="Vérifier sur BLOCKTRUST™">Identité certifiée BLOCKTRUST™</a>`

  return (
    <>
      <div className="mb-6">
        <Link
          href="/dashboard/certificates"
          className="mb-4 inline-block text-sm text-bt-cyan transition hover:text-bt-cyan/90"
        >
          ← Liste de mes badges
        </Link>
        <h1 className="font-syne text-4xl font-bold tracking-tight text-white">Mon badge</h1>
        <p className="mt-2 max-w-xl text-sm text-white/50">
          Partagez votre identité vérifiée avec un lien temporaire — plus sûr qu&apos;un lien permanent.
        </p>
      </div>

      {notAnchored ? (
        <div className="mb-6">
          <BlockchainUpgradePrompt />
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
        <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Aperçu du badge</h2>
        <div className="flex flex-col items-center justify-center py-4">
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              {certStatusLabel}
            </span>
            <span className="rounded-full border border-bt-cyan/25 bg-bt-cyan/10 px-3 py-1 text-xs font-semibold text-bt-cyan">
              TrustScore {trustScore}/100
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                notAnchored
                  ? 'border-[#BDA76B]/30 bg-[#BDA76B]/10 text-[#BDA76B]'
                  : 'border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]'
              }`}
            >
              {notAnchored ? 'Non ancré' : 'Ancré sur Polygon'}
            </span>
          </div>
          {badgeData.trustScore ? (
            <div className="mt-3 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-bt-cyan"
                style={{ width: `${Math.min(100, Math.max(0, trustScore))}%` }}
              />
            </div>
          ) : null}
          <a
            href={publicVerifyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-bt-cyan hover:underline"
          >
            Voir ma page publique
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>

      <section
        id="partage"
        className="mb-6 scroll-mt-6 rounded-xl border border-bt-cyan/30 bg-[#0d1f3c] p-5 sm:p-6"
      >
        <h2 className="font-syne text-2xl font-bold tracking-tight text-white">
          Partagez votre badge vérifié
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Utilisez un lien temporaire pour chaque partage. Il expire automatiquement et ne peut pas
          être réutilisé durablement par un tiers.
        </p>

        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
          Durée du lien
        </p>
        <div className="flex flex-wrap gap-2">
          {TTL_PRESETS.map((preset) => (
            <button
              key={preset.hours}
              type="button"
              onClick={() => setTtlHours(preset.hours)}
              className={`min-h-[40px] cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                ttlHours === preset.hours
                  ? 'border-bt-cyan/50 bg-bt-cyan/15 text-bt-cyan'
                  : 'border-white/10 bg-white/5 text-white/55 hover:border-white/20 hover:text-white/80'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleCopyRotatingLink()}
            disabled={generating}
            className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-bt-cyan px-4 text-sm font-semibold text-navy transition hover:bg-bt-cyan/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {secureLinkCopied ? (
              <>
                <Check className="h-4 w-4 shrink-0" aria-hidden />
                Lien sécurisé copié
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                {generating ? 'Génération…' : 'Copier le lien sécurisé'}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            <QrCode className="h-4 w-4 shrink-0" aria-hidden />
            {showQr ? 'Masquer le QR code' : 'Afficher le QR code'}
          </button>
        </div>

        {verifyLink ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
            <p className="break-all font-mono text-xs text-bt-cyan">{verifyLink.url}</p>
            {expiresLabel ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-white/45">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Expire le {expiresLabel}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-white/40">
            Cliquez sur « Copier le lien sécurisé » pour générer un nouveau lien.
          </p>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-bt-cyan/15 bg-bt-cyan/5 p-3 text-sm leading-relaxed text-white/70">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-bt-cyan" aria-hidden />
          <p>
            Ce lien est à usage unique et expire automatiquement. Un nouveau lien est généré à
            chaque clic sur « Copier le lien sécurisé ».
          </p>
        </div>

        {showQr ? (
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
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
            <button
              type="button"
              onClick={() => void handleDownloadRotatingQR()}
              disabled={!verifyLink || generating}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 text-sm font-semibold text-bt-cyan disabled:opacity-40"
            >
              <Download size={18} aria-hidden />
              Télécharger le QR (PNG)
            </button>
          </div>
        ) : null}

        <details className="mt-5 rounded-lg border border-white/10 bg-black/20">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-white/70">
            Lien permanent (pour signature email, site web)
            <ChevronDown className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
          </summary>
          <div className="space-y-3 border-t border-white/10 px-4 py-3">
            <p className="text-sm leading-relaxed text-white/55">
              Le lien permanent ne change jamais. Il est adapté pour votre signature email ou votre
              site web, mais un tiers pourrait le copier. Préférez le lien temporaire pour les
              échanges ponctuels.
            </p>
            <code className="block break-all font-mono text-xs text-white/45">{publicVerifyHref}</code>
            <button
              type="button"
              onClick={() => void handleCopy(publicVerifyHref, 'permanent')}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-4 text-sm text-white/80 transition hover:bg-white/5"
            >
              {permanentLinkCopied ? 'Lien permanent copié' : 'Copier le lien permanent'}
            </button>
          </div>
        </details>

        <details className="mt-3 rounded-lg border border-white/10 bg-black/20">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-white/70">
            Historique de mes liens
            <ChevronDown className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
          </summary>
          <div className="border-t border-white/10 px-4 py-3">
            {historyLoading ? (
              <p className="text-xs text-white/40">Chargement…</p>
            ) : tokenHistory.length === 0 ? (
              <p className="text-xs text-white/30">Aucun lien rotatif généré.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs text-white/60">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40">
                      <th className="py-2 pr-3 font-medium">Lien</th>
                      <th className="py-2 pr-3 font-medium">Créé</th>
                      <th className="py-2 pr-3 font-medium">Durée</th>
                      <th className="py-2 pr-3 font-medium">Statut</th>
                      <th className="py-2 font-medium">Consultations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenHistory.map((item) => (
                      <tr key={item.id} className="border-b border-white/5">
                        <td className="py-2 pr-3 font-mono">{item.tokenPreview}</td>
                        <td className="py-2 pr-3">
                          {new Date(item.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2 pr-3">
                          {ttlDurationLabel(item.createdAt, item.expiresAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(item.status)}`}
                          >
                            {formatTokenStatus(item.status)}
                          </span>
                        </td>
                        <td className="py-2">{item.used ? 1 : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      </section>

      <details className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 font-syne text-xl font-bold tracking-tight text-white">
          Intégration
          <ChevronDown className="h-5 w-5 shrink-0 text-white/35" aria-hidden />
        </summary>
        <div className="mt-4 space-y-3">
          <details className="rounded-lg border border-white/10 bg-black/20">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-white/80">
              Badge pour mon site web
              <ChevronDown className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
            </summary>
            <div className="space-y-3 border-t border-white/10 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">Code embed HTML</p>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <pre className="overflow-auto text-xs text-white/70">
                  <code>{getEmbedCode()}</code>
                </pre>
              </div>
              <button
                type="button"
                onClick={handleCopyEmbed}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-bt-cyan transition hover:bg-bt-cyan/25"
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
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">Widget script</p>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
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
          </details>

          <details className="rounded-lg border border-white/10 bg-black/20">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-white/80">
              Badge pour ma signature email
              <ChevronDown className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
            </summary>
            <div className="space-y-3 border-t border-white/10 px-4 py-3">
              <p className="text-sm leading-relaxed text-white/55">
                Collez ce snippet HTML dans votre signature. Le lien rotatif est régénéré depuis
                « Copier le lien sécurisé » ci-dessus — régénérez-le régulièrement.
              </p>
              <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                <pre className="overflow-auto text-xs text-white/70">
                  <code>{emailSnippet}</code>
                </pre>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy(emailSnippet, 'email')}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 text-sm font-semibold text-bt-cyan"
              >
                {emailSnippetCopied ? 'Snippet copié' : 'Copier le snippet HTML'}
              </button>
            </div>
          </details>

          <details className="rounded-lg border border-white/10 bg-black/20">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-white/80">
              QR code téléchargeable
              <ChevronDown className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
            </summary>
            <div className="space-y-3 border-t border-white/10 px-4 py-3">
              <p className="text-sm text-white/55">
                PNG haute résolution du QR associé à votre lien de vérification actuel.
              </p>
              <button
                type="button"
                onClick={() => void handleDownloadRotatingQR()}
                disabled={!verifyLink || generating}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 text-sm font-semibold text-bt-cyan disabled:opacity-40"
              >
                <Download size={18} aria-hidden />
                Télécharger le QR (PNG)
              </button>
            </div>
          </details>
        </div>
      </details>

      <details className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 font-syne text-2xl font-bold tracking-tight text-white">
          Informations du certificat
          <ChevronDown className="h-5 w-5 shrink-0 text-white/35" aria-hidden />
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/40">ID certificat</p>
            <p className="break-all font-mono text-sm text-white/70">{verifyIdLabel}</p>
            {isAdmin ? (
              <p className="mt-1 break-all font-mono text-[10px] text-white/25">{badgeData.id}</p>
            ) : null}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/40">Date de création</p>
            <p className="text-sm text-white">{issuedAtLabel}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/40">Algorithme</p>
            <p className="font-mono text-sm text-white/70">ES256</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/40">Ancrage Polygon</p>
            {badgeData.polygonExplorerUrl ? (
              <a
                href={badgeData.polygonExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-bt-cyan hover:underline"
              >
                Voir sur PolygonScan
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <p className="text-sm text-white/45">{notAnchored ? 'Non ancré' : 'Ancré sur Polygon'}</p>
            )}
            {badgeData.polygonTxHash ? (
              <p className="mt-1 break-all font-mono text-[10px] text-white/30">{badgeData.polygonTxHash}</p>
            ) : null}
          </div>
        </div>
      </details>
    </>
  )
}
