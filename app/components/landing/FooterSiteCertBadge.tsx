'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'

/**
 * Badge certificat site (footer) — discret, fail-soft si env ou image absente.
 */
export default function FooterSiteCertBadge() {
  const certId = process.env.NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID?.trim()
  const [loadFailed, setLoadFailed] = useState(false)

  if (!certId || loadFailed) {
    return null
  }

  const verifyUrl = buildPublicVerifyUrl(certId)
  const badgeSrc = `/api/badge/${encodeURIComponent(certId)}?size=xs`

  return (
    <Link
      href={verifyUrl}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 transition hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]"
      title="Vérifier la certification de ce site"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={badgeSrc}
        alt=""
        width={34}
        height={40}
        className="h-10 w-auto shrink-0"
        loading="lazy"
        onError={() => setLoadFailed(true)}
      />
      <span className="text-[11px] leading-tight text-white/50 sm:text-xs">
        Site certifié BLOCKTRUST™
      </span>
    </Link>
  )
}
