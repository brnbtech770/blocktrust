'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

type BisVerifyQrCodeProps = {
  url: string
  size?: number
  className?: string
}

export function BisVerifyQrCode({ url, size = 160, className }: BisVerifyQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(url, { width: size, margin: 1 }),
      )
      .then((src) => {
        if (!cancelled) setDataUrl(src)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [url, size])

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-white/10 bg-[#0a1628] ${className ?? ''}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-white/30" aria-hidden />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="QR code de vérification BIS"
      className={`rounded-lg border border-white/10 ${className ?? ''}`}
    />
  )
}
