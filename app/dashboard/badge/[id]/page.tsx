// app/dashboard/badge/[id]/page.tsx
// Page pour voir son badge, copier le code embed, télécharger le QR
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardSidebarClient from '@/app/components/DashboardSidebarClient'
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
      return 'Identité vérifiée par BlockTrust'
    }
    return `Entreprise certifiée BlockTrust${badgeData.entity.siret ? ` • SIRET ${badgeData.entity.siret}` : ''}`
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  if (error || !badgeData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error || 'Badge non trouvé'}</div>
      </div>
    )
  }

  const badgeId = badgeData.publicId || badgeData.id
  const verifyUrl = `${window.location.origin}/verify/${badgeId}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <DashboardSidebarClient />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <a
            href="/dashboard/certificates"
            className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
          >
            ← Retour aux certificats
          </a>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Mon Badge</h1>
          <p className="text-gray-400 text-base">ID: {badgeId}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Aperçu du badge */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Aperçu du badge</h2>
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="mb-4">
                <img
                  src={`/api/badge/${badgeId}`}
                  alt="Badge BlockTrust"
                  className="mx-auto max-w-full h-auto"
                />
              </div>
              <p className="text-gray-400 text-base mb-2">{getBadgeText()}</p>
              <p className="text-white font-bold text-lg">{getEntityName()}</p>
              {badgeData.trustScore && (
                <p className="text-cyan-400 text-base mt-2 font-semibold">
                  TrustScore: {badgeData.trustScore.score}/100 ({badgeData.trustScore.level})
                </p>
              )}
            </div>
          </div>

          {/* Code embed */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Code embed HTML</h2>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <pre className="text-xs text-gray-300 overflow-auto">
                <code>{getEmbedCode()}</code>
              </pre>
            </div>
            <button
              onClick={handleCopyEmbed}
              className="w-full bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition flex items-center justify-center gap-2"
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
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">QR Code</h2>
          <div className="flex items-center gap-6">
            <div className="bg-white p-4 rounded-xl">
              <img
                src={`/api/qr/${badgeId}?format=png`}
                alt="QR Code"
                width={200}
                height={200}
              />
            </div>
            <div className="flex-1">
              <p className="text-gray-400 text-base mb-4">
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
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Statistiques</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-base font-medium mb-2">Nombre de vérifications</p>
                <p className="text-4xl font-bold text-white tracking-tight">{badgeData.verificationCount || 0}</p>
              </div>
              <div>
                <p className="text-gray-400 text-base font-medium mb-2">Dernière vérification</p>
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
                <p className="text-gray-400 text-base font-medium mb-2">Lien de vérification</p>
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
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
