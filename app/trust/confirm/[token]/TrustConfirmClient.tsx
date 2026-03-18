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
      <div className="w-full max-w-md mt-12 text-center">
        <div className="animate-spin w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-white">Confirmation en cours...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="w-full max-w-md mt-12 text-center">
        <p className="text-red-400 mb-4">{result?.message}</p>
        <Link href="/dashboard/trust-circle" className="text-cyan-400 underline">Retour au Trust Circle</Link>
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-md mt-12 rounded-2xl p-8 text-center"
      style={{ border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(13,31,60,0.8)' }}
    >
      <div className="text-4xl mb-4">{result?.trustType === 'MUTUAL' ? '🎉' : '✓'}</div>
      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
        {result?.trustType === 'MUTUAL' ? 'Confiance mutuelle activée !' : 'Relation confirmée'}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--bt-muted)' }}>{result?.message}</p>
      {result?.addBackUrl && (
        <p className="text-sm mb-4">
          <a href={result.addBackUrl} className="text-cyan-400 underline">Ajouter en retour à mon Trust Circle</a>
        </p>
      )}
      <button
        type="button"
        onClick={() => router.push('/dashboard/trust-circle')}
        className="w-full py-3 rounded-lg font-bold text-white"
        style={{ background: '#00d4ff', color: '#0a1628' }}
      >
        Aller à mon Trust Circle
      </button>
    </div>
  )
}
