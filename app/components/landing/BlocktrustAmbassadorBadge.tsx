'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'

type BlocktrustAmbassadorBadgeProps = {
  certId: string
}

/**
 * Badge ambassadeur — certificat réel (/api/badge) vérifiable via /verify.
 * Fail-soft : section masquée si l’image ne charge pas.
 */
export default function BlocktrustAmbassadorBadge({ certId }: BlocktrustAmbassadorBadgeProps) {
  const [loadFailed, setLoadFailed] = useState(false)

  if (loadFailed || !certId.trim()) {
    return null
  }

  const verifyUrl = buildPublicVerifyUrl(certId)
  const badgeSrc = `/api/badge/${encodeURIComponent(certId)}?size=sm`

  return (
    <section
      id="blocktrust-ambassador"
      aria-labelledby="ambassador-heading"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-xl border border-[#00d4ff]/15 bg-gradient-to-br from-[#0d1f3c]/90 to-[#0a1628]/95 px-5 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-7 sm:py-7">
        <Link
          href={verifyUrl}
          className="group shrink-0 transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00d4ff]"
          title="Vérifier l'identité BLOCKTRUST™"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badgeSrc}
            alt="Badge BLOCKTRUST™ certifié"
            width={130}
            height={152}
            className="h-auto w-[120px] drop-shadow-[0_0_20px_rgba(0,212,255,0.2)] transition group-hover:drop-shadow-[0_0_28px_rgba(0,212,255,0.35)] sm:w-[130px]"
            loading="lazy"
            onError={() => setLoadFailed(true)}
          />
        </Link>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2
            id="ambassador-heading"
            className="font-syne text-lg font-bold text-white sm:text-xl"
          >
            Ce site est certifié BLOCKTRUST™
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Notre identité est vérifiée et ancrée sur la blockchain. Cliquez sur le badge pour le
            vérifier vous-même.
          </p>
          <Link
            href={verifyUrl}
            className="mt-3 inline-block text-sm font-semibold text-[#00d4ff] underline-offset-4 hover:underline"
          >
            Vérifiez notre identité →
          </Link>
        </div>
      </div>
    </section>
  )
}
