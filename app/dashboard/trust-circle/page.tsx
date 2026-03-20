// app/dashboard/trust-circle/page.tsx
// Réseau de confiance User-centric (UserTrustRelation + UserManualTrustEntry)
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserPlus, Trash2 } from 'lucide-react'
import TrustCircleInviteModal from '@/app/components/TrustCircleInviteModal'
import TrustCircleManualModal from '@/app/components/TrustCircleManualModal'
import { QuotaBanner } from '@/app/components/trust-circle/QuotaBanner'

interface TrustCircleData {
  mutual: any[]
  unilateral: any[]
  pending: any[]
  manualEntries: any[]
  stats: {
    current: number
    limit: number | null
    percentage: number
    shouldShowUpgrade: boolean
    upgradeMessage: string | null
  }
}

export default function TrustCirclePage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [data, setData] = useState<TrustCircleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'mutual' | 'pending' | 'manual'>('all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [userEntities, setUserEntities] = useState<Array<{ id: string; name: string; entityType: string }>>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!toastMessage) return
    const t = window.setTimeout(() => setToastMessage(null), 3500)
    return () => window.clearTimeout(t)
  }, [toastMessage])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/')
      return
    }
    if (sessionStatus === 'authenticated') {
      fetchTrustCircle()
    }
  }, [sessionStatus, router])

  const fetchTrustCircle = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/trust-circle', { credentials: 'include' })
      if (!response.ok) {
        if (response.status === 403) {
          let msg =
            'Abonnez-vous à une offre incluant le Trust Circle pour accéder à cette page.'
          try {
            const err = await response.json()
            if (err?.message && typeof err.message === 'string') msg = err.message
          } catch {
            /* ignore */
          }
          router.replace(
            `/pricing?feature=trustCircle&message=${encodeURIComponent(msg)}`
          )
          return
        }
        throw new Error('Erreur lors du chargement')
      }
      const data = await response.json()
      setData(data)
      const entitiesResponse = await fetch('/api/entities', { credentials: 'include' })
      if (entitiesResponse.ok) {
        const entities = await entitiesResponse.json()
        setUserEntities(
          (entities || []).map((e: any) => ({
            id: e.id,
            name: e.entityType === 'INDIVIDUAL'
              ? `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email
              : e.legalName || e.tradeName || e.email,
            entityType: e.entityType,
          }))
        )
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, deleteType: 'relation' | 'manual') => {
    if (!confirm('Supprimer cette entité du Trust Circle ?')) return
    try {
      const res = await fetch(`/api/trust-circle/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: deleteType }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erreur suppression')
      }
      setToastMessage('Entité supprimée')
      await fetchTrustCircle()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const totalEntites = (data.mutual?.length ?? 0) + (data.unilateral?.length ?? 0) + (data.pending?.length ?? 0) + (data.manualEntries?.length ?? 0)
  const quotaAllowed = data.stats.limit == null || data.stats.current < data.stats.limit

  return (
    <>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Mon Trust Circle
            </h1>
            <p className="text-gray-400 text-base" style={{ fontFamily: 'var(--font-mono-bt), monospace' }}>
              {data.stats.current} entités · {(data.mutual?.length ?? 0)} mutuelles
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={!quotaAllowed}
            className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={18} />
            + Ajouter
          </button>
        </div>

        <QuotaBanner
          current={data.stats.current}
          limit={data.stats.limit}
          percentage={data.stats.percentage}
          shouldShowUpgrade={data.stats.shouldShowUpgrade}
          upgradeMessage={data.stats.upgradeMessage}
        />

        <div className="flex gap-2 mb-6 border-b border-gray-700">
          {(['all', 'mutual', 'pending', 'manual'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition rounded-t ${
                activeTab === tab ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              {tab === 'all' && `Toutes (${totalEntites})`}
              {tab === 'mutual' && `Mutuelles (${data.mutual?.length ?? 0})`}
              {tab === 'pending' && `En attente (${data.pending?.length ?? 0})`}
              {tab === 'manual' && `Manuelles (${data.manualEntries?.length ?? 0})`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTab === 'all' && [
            ...(data.mutual || []).map((r: any) => (
              <Card key={r.id} type="mutual" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
            )),
            ...(data.unilateral || []).map((r: any) => (
              <Card key={r.id} type="unilateral" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
            )),
            ...(data.pending || []).map((r: any) => (
              <Card key={r.id} type="pending" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
            )),
            ...(data.manualEntries || []).map((e: any) => (
              <Card key={e.id} type="manual" data={e} onDelete={() => handleDelete(e.id, 'manual')} />
            )),
          ]}
          {activeTab === 'mutual' && (data.mutual || []).map((r: any) => (
            <Card key={r.id} type="mutual" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
          ))}
          {activeTab === 'pending' && (data.pending || []).map((r: any) => (
            <Card key={r.id} type="pending" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
          ))}
          {activeTab === 'manual' && (data.manualEntries || []).map((e: any) => (
            <Card key={e.id} type="manual" data={e} onDelete={() => handleDelete(e.id, 'manual')} />
          ))}
        </div>

        {totalEntites === 0 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-bold text-white mb-2">Aucune entité</h3>
            <p className="text-gray-400 mb-6">Ajoutez des contacts à votre cercle de confiance</p>
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={!quotaAllowed}
              className="bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50"
            >
              + Ajouter
            </button>
          </div>
        )}

        <TrustCircleInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={fetchTrustCircle}
          userEntities={userEntities}
        />
        <TrustCircleManualModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onSuccess={fetchTrustCircle}
          userEntities={userEntities}
        />

        {toastMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-emerald-500/35 bg-emerald-950/90 px-4 py-2.5 text-sm text-emerald-100 shadow-lg backdrop-blur-sm"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            {toastMessage}
          </div>
        ) : null}
    </>
  )
}

function Card({ type, data, onDelete }: { type: 'mutual' | 'unilateral' | 'pending' | 'manual'; data: any; onDelete?: () => void }) {
  const name = data.toUser?.name || data.toName || data.entityName || data.toEmail || '—'
  const email = data.toUser?.email || data.toEmail || data.entityEmail
  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        borderColor:
          type === 'mutual'
            ? 'rgba(0,212,255,0.4)'
            : type === 'unilateral'
              ? 'rgba(0,212,255,0.25)'
              : type === 'manual'
                ? 'rgba(29,184,126,0.3)'
                : 'rgba(255,255,255,0.1)',
        background: 'rgba(13,31,60,0.8)',
      }}
    >
      <div className="flex justify-between items-start">
        <div>
          {type === 'mutual' && <span className="text-[9px] font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Mutuelle</span>}
          {type === 'unilateral' && <span className="text-[9px] text-cyan-400/90 bg-cyan-500/10 px-2 py-0.5 rounded">Unilatérale</span>}
          {type === 'pending' && <span className="text-[9px] text-gray-400 bg-white/10 px-2 py-0.5 rounded">Invitation envoyée</span>}
          {type === 'manual' && <span className="text-[9px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Vérifié admin</span>}
          <h3 className="text-lg font-bold text-white mt-1">{name}</h3>
          {email && <p className="text-sm text-gray-400">{email}</p>}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Supprimer du Trust Circle"
            className="p-1.5 rounded-md text-red-400/55 hover:text-red-400 hover:bg-red-500/15 transition-colors shrink-0"
            aria-label="Supprimer cette entité du Trust Circle"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  )
}
