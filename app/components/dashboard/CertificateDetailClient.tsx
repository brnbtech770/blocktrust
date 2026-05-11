// app/components/dashboard/CertificateDetailClient.tsx
// Composant client pour télécharger QR code et copier code HTML
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download, Loader2, ClipboardCheck, OctagonAlert } from 'lucide-react'

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
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 500,
        margin: 2,
      })

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
      const QRCode = (await import('qrcode')).default
      const svg = await QRCode.toString(verifyUrl, {
        type: 'svg',
        width: 500,
        margin: 2,
      })

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

      router.refresh()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur'
      alert(`Erreur : ${msg}`)
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="space-y-3">
      {verifyUrl && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 py-2 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-600"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Télécharger PNG
          </button>
          <button
            type="button"
            onClick={handleDownloadSVG}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 py-2 px-4 text-sm font-semibold text-white transition-colors hover:bg-gray-600"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Télécharger SVG
          </button>
        </div>
      )}

      {htmlCode && (
        <button
          type="button"
          onClick={handleCopyHTML}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-bt-cyan py-2.5 px-4 font-sans font-semibold text-navy transition-all hover:bg-bt-cyan/90"
        >
          {copied ? (
            <>
              <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />
              Code copié !
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 shrink-0" aria-hidden />
              Copier le code HTML
            </>
          )}
        </button>
      )}

      {certificateId && (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={revoking}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/20 py-2.5 px-4 font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
        >
          {revoking ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Révocation...
            </>
          ) : (
            <>
              <OctagonAlert className="h-4 w-4 shrink-0" aria-hidden />
              Révoquer ce certificat
            </>
          )}
        </button>
      )}
    </div>
  )
}
