// app/dashboard/badge/[id]/BadgeDashboardClient.tsx
// Page client — badge, embed, QR, IDs
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import VerifyBadgeButton from '@/app/components/VerifyBadgeButton'
import { truncateVerificationPublicId } from '@/lib/truncate-public-id'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'
import { Copy, Download, ExternalLink, Check, Link2, Clock } from 'lucide-react'

interface BadgeData {
  id: string
  publicId: string | null
  status: string
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

type CopyTarget = 'embed' | 'script' | 'secure' | 'link'

type BadgeDashboardClientProps = {
  isAdmin: boolean
}

export default function BadgeDashboardClient({ isAdmin }: BadgeDashboardClientProps) {
  const params = useParams()
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [embedCopied, setEmbedCopied] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
  const [secureLinkCopied, setSecureLinkCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [verifyLink, setVerifyLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/')
      return
    }
    if (sessionStatus === 'authenticated') {
      fetchBadge()
    }
  }, [sessionStatus, router, params.id])

  const fetchBadge = async () => {
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
          c.id === params.id || c.publicId === params.id
      )

      if (!certificate) {
        throw new Error('Certificat non trouvé')
      }

      try {
        const trustScoreResponse = await fetch(
          `/api/entities/${certificate.entity.id}/trust-score`,
          { credentials: 'include' }
        )
        if (trustScoreResponse.ok) {
          const trustScore = await trustScoreResponse.json()
          certificate.trustScore = trustScore
        }
      } catch (err) {
        console.error('Error fetching trust score:', err)
      }

      setBadgeData(certificate)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const getEmbedCode = () => {
    if (!badgeData) return ''
    const badgeId = badgeData.publicId || badgeData.id
    const baseUrl = window.location.origin
    return `<a href="${baseUrl}/verify?certId=${encodeURIComponent(badgeId)}" target="_blank" rel="noopener noreferrer" title="Vérifier sur BlockTrust">
  <img src="${baseUrl}/api/badge/${badgeId}" alt="Badge BlockTrust vérifié" width="150" height="200" />
</a>`
  }

  const getScriptCode = () => {
    if (!badgeData) return ''
    const widgetCertKey = badgeData.publicId?.trim() || badgeData.id
    const baseUrl = window.location.origin
    return `<!-- BlockTrust Badge Widget -->
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
      return
    }
    if (target === 'embed') {
      setEmbedCopied(true)
      setTimeout(() => setEmbedCopied(false), 2000)
    } else if (target === 'script') {
      setScriptCopied(true)
      setTimeout(() => setScriptCopied(false), 2000)
    } else if (target === 'link') {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } else {
      setSecureLinkCopied(true)
      setTimeout(() => setSecureLinkCopied(false), 2000)
    }
  }

  const handleCopyEmbed = () => handleCopy(getEmbedCode(), 'embed')

  const handleCopyScript = () => handleCopy(getScriptCode(), 'script')

  const handleDownloadQR = (format: 'png' | 'svg') => {
    if (!badgeData) return
    const badgeId = badgeData.publicId || badgeData.id
    const url = `/api/qr/${badgeId}?format=${format}`
    const link = document.createElement('a')
    link.href = url
    link.download = `blocktrust-qr-${badgeId}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleGenerateSecureLink = async () => {
    if (!badgeData) return
    setGenerating(true)
    setVerifyLink(null)
    try {
      const res = await fetch(
        `/api/certificates/${encodeURIComponent(badgeData.id)}/verify-link`,
        { credentials: 'include' },
      )
      const data = (await res.json()) as {
        verifyUrl?: string
        expiresAt?: string
        message?: string
        error?: string
      }
      if (!res.ok) {
        alert(
          typeof data.message === 'string'
            ? data.message
            : 'Impossible de générer le lien sécurisé.',
        )
        return
      }
      if (data.verifyUrl && data.expiresAt) {
        setVerifyLink({ url: data.verifyUrl, expiresAt: data.expiresAt })
        await handleCopy(data.verifyUrl, 'secure')
      }
    } catch {
      alert('Erreur réseau.')
    } finally {
      setGenerating(false)
    }
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
            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-mono text-sm text-white/70">{verifyIdLabel}</p>
              <button
                type="button"
                onClick={() => void handleCopy(publicVerifyHref, 'link')}
                className="flex shrink-0 text-white/30 transition hover:text-white/60"
                aria-label="Copier le lien de vérification"
              >
                {linkCopied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-white/20">
              Partagez cet ID pour permettre la vérification
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

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Aperçu du badge</h2>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#060d1a] p-6">
              <img
                src={`/api/badge/${badgeId}?size=md`}
                alt="Aperçu du badge BLOCKTRUST"
                className="h-auto max-w-full"
                style={{ maxWidth: '320px' }}
              />
            </div>
            <p className="mt-4 text-center font-mono text-xs text-white/40">{verifyIdLabel}</p>
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
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-bt-cyan transition hover:bg-bt-cyan/25"
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
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/15 px-4 py-2 text-[#BDA76B] transition hover:bg-[#BDA76B]/25"
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
        <h2 className="mb-6 font-syne text-lg font-semibold text-white">
          QR Code & Vérification
        </h2>

        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <div className="mx-auto shrink-0 sm:mx-0">
            <div className="h-[200px] w-[200px] rounded-xl bg-white p-4">
              <img
                src={`/api/qr/${badgeId}?format=png`}
                alt="QR Code"
                width={168}
                height={168}
                className="h-full w-full"
              />
            </div>
          </div>

          <div className="w-full flex-1 space-y-3">
            <VerifyBadgeButton certId={badgeId} behavior="copy" />

            <button
              type="button"
              onClick={handleGenerateSecureLink}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#BDA76B]/30 bg-[#BDA76B]/10 py-3 text-sm font-semibold text-[#BDA76B] transition hover:bg-[#BDA76B]/20 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4 shrink-0" aria-hidden />
              {generating ? 'Génération...' : secureLinkCopied ? 'Lien copié !' : 'Lien sécurisé 24h'}
            </button>

            {verifyLink ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 flex items-center gap-1 text-xs text-white/40">
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
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all font-mono text-xs text-white/60">
                    {verifyLink.url}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopy(verifyLink.url, 'secure')}
                    className="shrink-0 text-[#00d4ff] transition hover:text-white"
                    aria-label="Copier le lien"
                  >
                    {secureLinkCopied ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs italic text-white/20">
                  Lien unique — générez-en un nouveau pour chaque envoi
                </p>
              </div>
            ) : null}

            <p className="text-xs leading-relaxed text-white/30">
              Le QR code change après chaque scan — impossible à copier. Le lien sécurisé expire après 24h.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadQR('png')}
                className="flex items-center gap-2 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/20 px-4 py-2 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/30"
              >
                <Download size={18} aria-hidden />
                Télécharger PNG
              </button>
              <button
                type="button"
                onClick={() => handleDownloadQR('svg')}
                className="flex items-center gap-2 rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/20 px-4 py-2 text-sm font-semibold text-[#BDA76B] transition hover:bg-[#BDA76B]/30"
              >
                <Download size={18} aria-hidden />
                Télécharger SVG
              </button>
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
            <p className="mb-2 text-base font-medium text-white/60">Lien de vérification</p>
            <a
              href={publicVerifyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-bt-cyan hover:text-bt-cyan/90"
            >
              Ouvrir <ExternalLink size={14} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
