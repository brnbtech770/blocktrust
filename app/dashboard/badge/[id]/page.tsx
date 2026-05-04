// app/dashboard/badge/[id]/page.tsx
// Page pour voir son badge, copier le code embed, télécharger le QR
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardSidebarClient from '@/app/components/DashboardSidebarClient'
import VerifyBadgeButton from '@/app/components/VerifyBadgeButton'
import { Copy, Download, ExternalLink, Check } from 'lucide-react'

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

export default function DashboardBadgePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [badgeData, setBadgeData] = useState<BadgeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

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
        (c: any) => c.id === params.id || c.publicId === params.id
      )

      if (!certificate) {
        throw new Error('Certificat non trouvé')
      }

      // Récupérer le TrustScore
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getEntityName = () => {
    if (!badgeData) return ''
    if (badgeData.entity.entityType === 'INDIVIDUAL') {
      return `${badgeData.entity.firstName || ''} ${badgeData.entity.lastName || ''}`.trim() || badgeData.entity.email
    }
    return badgeData.entity.legalName || badgeData.entity.tradeName || badgeData.entity.email
  }

  const getBadgeText = () => {
    if (!badgeData) return ''
    if (badgeData.entity.entityType === 'INDIVIDUAL') {
      return 'Identité vérifiée par BLOCKTRUST'
    }
    return `Entreprise certifiée BLOCKTRUST${badgeData.entity.siret ? ` • SIRET ${badgeData.entity.siret}` : ''}`
  }

  const getEmbedCode = () => {
    if (!badgeData) return ''
    const badgeId = badgeData.publicId || badgeData.id
    const baseUrl = window.location.origin
    return `<a href="${baseUrl}/verify/${badgeId}" target="_blank" rel="noopener noreferrer" title="Vérifier sur BlockTrust">
  <img src="${baseUrl}/api/badge/${badgeId}" alt="Badge BlockTrust vérifié" width="150" height="200" />
</a>`
  }

  const handleCopyEmbed = async () => {
    const embedCode = getEmbedCode()
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Erreur lors de la copie')
    }
  }

  const handleDownloadQR = async (format: 'png' | 'svg') => {
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

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bt-navy)]">
        <div className="text-xl text-white/80">Chargement...</div>
      </div>
    )
  }

  if (error || !badgeData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bt-navy)]">
        <div className="text-red-400">{error || 'Badge non trouvé'}</div>
      </div>
    )
  }

  const badgeId = badgeData.publicId || badgeData.id
  const verifyUrl = `${window.location.origin}/verify/${badgeId}`

  return (
    <div className="min-h-screen bg-[var(--bt-navy)]">
      <DashboardSidebarClient />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <a
            href="/dashboard/certificates"
            className="mb-4 inline-block text-bt-cyan hover:text-bt-cyan/90"
          >
            ← Retour aux certificats
          </a>
          <h1 className="font-syne mb-2 text-4xl font-bold tracking-tight text-white">Mon Badge</h1>
          <p className="font-mono text-base text-white/60">ID: {badgeId}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Aperçu du badge */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
            <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Aperçu du badge</h2>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="mb-4">
                <img
                  src={`/api/badge/${badgeId}`}
                  alt="Badge BlockTrust"
                  className="mx-auto max-w-full h-auto"
                />
              </div>
              <p className="mb-2 text-base text-white/60">{getBadgeText()}</p>
              <p className="text-white font-bold text-lg">{getEntityName()}</p>
              {badgeData.trustScore && (
                <p className="mt-2 text-base font-semibold text-bt-cyan">
                  TrustScore: {badgeData.trustScore.score}/100 ({badgeData.trustScore.level})
                </p>
              )}
            </div>
          </div>

          {/* Code embed */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
            <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Code embed HTML</h2>
            <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-4">
              <pre className="overflow-auto text-xs text-white/70">
                <code>{getEmbedCode()}</code>
              </pre>
            </div>
            <button
              onClick={handleCopyEmbed}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-bt-cyan transition hover:bg-bt-cyan/25"
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copié !
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copier le code
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30 mb-6">
            <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">QR Code</h2>
          <div className="flex items-start gap-6">
            <div className="flex w-[200px] shrink-0 flex-col sm:w-auto sm:max-w-[232px]">
              <div className="rounded-xl bg-white p-4">
                <img
                  src={`/api/qr/${badgeId}?format=png`}
                  alt="QR Code"
                  width={200}
                  height={200}
                />
              </div>
              <VerifyBadgeButton certId={badgeId} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="mb-4 text-base text-white/60">
                Scannez ce QR code pour vérifier l'authenticité du certificat
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadQR('png')}
                  className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition flex items-center gap-2"
                >
                  <Download size={18} />
                  Télécharger PNG
                </button>
                <button
                  onClick={() => handleDownloadQR('svg')}
                  className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition flex items-center gap-2"
                >
                  <Download size={18} />
                  Télécharger SVG
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
            <h2 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">Statistiques</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="mb-2 text-base font-medium text-white/60">Nombre de vérifications</p>
                <p className="text-4xl font-bold text-white tracking-tight">{badgeData.verificationCount || 0}</p>
              </div>
              <div>
                <p className="mb-2 text-base font-medium text-white/60">Dernière vérification</p>
                <p className="text-white text-lg">
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
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-bt-cyan hover:text-bt-cyan/90"
              >
                Ouvrir <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
