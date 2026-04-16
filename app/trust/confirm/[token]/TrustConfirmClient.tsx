'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TrustConfirmClient({ token }: { token: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<{ trustType?: string; message?: string; addBackUrl?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/trust-circle/confirm/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setStatus('error')
          setResult({ message: data.error || 'Erreur' })
          return
        }
        setStatus('success')
        setResult(data)
      } catch {
        if (!cancelled) {
          setStatus('error')
          setResult({ message: 'Erreur réseau' })
        }
      }
    })()
    return () => { cancelled = true }
  }, [token])

  if (status === 'loading') {
    return (
      <div className="mt-12 w-full max-w-md text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-bt-cyan border-t-transparent" />
        <p className="text-white">Confirmation en cours...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mt-12 w-full max-w-md text-center">
        <p className="mb-4 text-red-400">{result?.message}</p>
        <Link href="/dashboard/trust-circle" className="text-bt-cyan underline hover:text-bt-cyan/90">
          Retour au Trust Circle
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-12 w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-gold/30">
      <div className="mb-4 text-4xl">{result?.trustType === 'MUTUAL' ? '🎉' : '✓'}</div>
      <h2 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">
        {result?.trustType === 'MUTUAL' ? 'Confiance mutuelle activée !' : 'Relation confirmée'}
      </h2>
      <p className="mb-6 text-sm text-white/60">{result?.message}</p>
      {result?.addBackUrl && (
        <p className="mb-4 text-sm">
          <a href={result.addBackUrl} className="text-bt-cyan underline hover:text-bt-cyan/90">
            Ajouter en retour à mon Trust Circle
          </a>
        </p>
      )}
      <button
        type="button"
        onClick={() => router.push('/dashboard/trust-circle')}
        className="w-full rounded-lg bg-bt-cyan py-3 font-bold text-navy transition hover:bg-bt-cyan/90"
      >
        Aller à mon Trust Circle
      </button>
    </div>
  )
}
