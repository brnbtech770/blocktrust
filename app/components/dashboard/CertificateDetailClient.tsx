// app/components/dashboard/CertificateDetailClient.tsx
// Composant client pour télécharger QR code et copier code HTML
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CertificateDetailClientProps = {
  verifyUrl?: string
  htmlCode?: string
  certificateId?: string
}

export default function CertificateDetailClient({ 
  verifyUrl, 
  htmlCode, 
  certificateId 
}: CertificateDetailClientProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const handleDownloadQR = async () => {
    if (!verifyUrl) return

    try {
      // Générer le QR code en PNG
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 500,
        margin: 2,
      })

      // Créer un lien de téléchargement
      const link = document.createElement('a')
      link.download = `blocktrust-qrcode-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Erreur lors du téléchargement du QR code:', error)
      alert('Erreur lors du téléchargement du QR code')
    }
  }

  const handleDownloadSVG = async () => {
    if (!verifyUrl) return

    try {
      // Générer le QR code en SVG
      const QRCode = (await import('qrcode')).default
      const svg = await QRCode.toString(verifyUrl, {
        type: 'svg',
        width: 500,
        margin: 2,
      })

      // Créer un blob et télécharger
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `blocktrust-qrcode-${Date.now()}.svg`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors du téléchargement du QR code SVG:', error)
      alert('Erreur lors du téléchargement du QR code SVG')
    }
  }

  const handleCopyHTML = () => {
    if (!htmlCode) return

    navigator.clipboard.writeText(htmlCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch((error) => {
      console.error('Erreur lors de la copie:', error)
      alert('Erreur lors de la copie du code')
    })
  }

  const handleRevoke = async () => {
    if (!certificateId) return

    if (!confirm('Êtes-vous sûr de vouloir révoquer ce certificat ? Cette action est irréversible.')) {
      return
    }

    setRevoking(true)

    try {
      const response = await fetch(`/api/certificates/${certificateId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la révocation')
      }

      // Rafraîchir la page
      router.refresh()
    } catch (error: any) {
      alert(`Erreur : ${error.message}`)
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="space-y-3">
      {verifyUrl && (
        <div className="flex gap-3">
          <button
            onClick={handleDownloadQR}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            📥 Télécharger PNG
          </button>
          <button
            onClick={handleDownloadSVG}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            📥 Télécharger SVG
          </button>
        </div>
      )}

      {htmlCode && (
        <button
          onClick={handleCopyHTML}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
        >
          {copied ? '✓ Code copié !' : '📋 Copier le code HTML'}
        </button>
      )}

      {certificateId && (
        <button
          onClick={handleRevoke}
          disabled={revoking}
          className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition-colors font-semibold py-2.5 px-4 disabled:opacity-50"
        >
          {revoking ? '⏳ Révocation...' : '🚫 Révoquer ce certificat'}
        </button>
      )}
    </div>
  )
}
