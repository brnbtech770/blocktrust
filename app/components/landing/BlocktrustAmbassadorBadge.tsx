import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import Reveal from '@/app/components/landing/Reveal'
import { buildPublicVerifyUrl, getBlocktrustBaseUrl } from '@/lib/public-verify-url'

type BlocktrustAmbassadorBadgeProps = {
  certId: string
}

/**
 * Badge ambassadeur — vrai certificat BLOCKTRUST™ vérifiable via /verify.
 * Ajout landing (section dédiée, sans modifier les sections existantes).
 */
export default function BlocktrustAmbassadorBadge({ certId }: BlocktrustAmbassadorBadgeProps) {
  const base = getBlocktrustBaseUrl()
  const verifyUrl = buildPublicVerifyUrl(certId)
  const badgeSrc = `${base}/api/badge/${encodeURIComponent(certId)}?size=md`

  return (
    <section
      id="blocktrust-ambassador"
      aria-labelledby="ambassador-heading"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8"
    >
      <Reveal className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#00d4ff]/20 bg-[#0d1f3c]/60 px-6 py-10 text-center sm:px-10">
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/10"
          aria-hidden
        >
          <ShieldCheck className="h-5 w-5 text-[#00d4ff]" />
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#BDA76B] font-mono">
          Eat your own dog food
        </p>

        <h2
          id="ambassador-heading"
          className="font-syne text-xl font-bold text-white sm:text-2xl"
        >
          Ce site est lui-même certifié BLOCKTRUST™
        </h2>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
          Un vrai badge vérifiable — signé ES256, ancré sur Polygon Mainnet. Scannez ou cliquez pour
          contrôler notre identité en direct.
        </p>

        <Link
          href={verifyUrl}
          className="group mt-6 inline-flex flex-col items-center gap-3 transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00d4ff]"
          title="Vérifier l'identité BLOCKTRUST™"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badgeSrc}
            alt="Badge BLOCKTRUST™ certifié — BRNB TECH"
            width={150}
            height={200}
            className="h-auto w-[120px] drop-shadow-[0_0_24px_rgba(0,212,255,0.25)] transition group-hover:drop-shadow-[0_0_32px_rgba(0,212,255,0.4)] sm:w-[150px]"
            loading="lazy"
          />
          <span className="text-sm font-semibold text-[#00d4ff] underline-offset-4 group-hover:underline">
            Vérifiez notre identité →
          </span>
        </Link>
      </Reveal>
    </section>
  )
}
