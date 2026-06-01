'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  quotaLabel: string | null
  isAdmin: boolean
}

export default function VerifyBadgeCard({ quotaLabel, isAdmin }: Props) {
  const router = useRouter()
  const [id, setId] = useState('')

  function goVerify(e: React.FormEvent) {
    e.preventDefault()
    const raw = id.trim()
    if (!raw) return
    router.push(`/verify/${encodeURIComponent(raw)}`)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:border-bt-cyan/30 sm:p-6">
      <div className="mb-3 flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          🔍
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-syne text-lg font-semibold text-white">Vérifier un badge</h3>
          <p className="mt-1 text-sm text-white/65">
            Scannez ou collez l&apos;ID d&apos;un badge BLOCKTRUST
          </p>
        </div>
      </div>
      <form onSubmit={goVerify} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Collez l'ID du certificat ou scannez le QR"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0a1628]/80 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-bt-cyan focus:outline-none focus:ring-2 focus:ring-bt-cyan/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg px-5 py-2.5 text-sm font-bold text-[#0a1628] transition hover:brightness-110 disabled:opacity-50"
          style={{ background: '#00d4ff' }}
          disabled={!id.trim()}
        >
          Vérifier
        </button>
      </form>
      <p className="mt-3 font-sans text-xs text-white/40">
        {isAdmin ? 'Sans limite (admin)' : quotaLabel ?? 'Quota non disponible'}
      </p>
    </div>
  )
}
