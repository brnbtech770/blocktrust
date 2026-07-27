// app/dashboard/trust-circle/page.tsx
// Réseau de confiance User-centric (UserTrustRelation + UserManualTrustEntry)
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserPlus, Trash2, Link2, Check, X } from 'lucide-react'
import TrustCircleInviteModal from '@/app/components/TrustCircleInviteModal'
import TrustCircleManualModal from '@/app/components/TrustCircleManualModal'
import { QuotaBanner } from '@/app/components/trust-circle/QuotaBanner'
import FeatureOnboardingTooltip from '@/app/components/onboarding/FeatureOnboardingTooltip'

type TrustCircleUserSummary = {
  id: string
  name: string | null
  email: string | null
  kycStatus?: string
}

type TrustRelationItem = {
  id: string
  toUser?: TrustCircleUserSummary | null
  toName?: string | null
  toEmail?: string | null
}

type ManualTrustEntry = {
  id: string
  entityName: string
  entityEmail?: string | null
  toEmail?: string | null
  toName?: string | null
}

type ReceivedTrustRelation = {
  id: string
  inviteToken: string | null
  fromUser?: TrustCircleUserSummary | null
}

type TrustCircleCardData = TrustRelationItem | ManualTrustEntry | ReceivedTrustRelation

type ApiEntityRow = {
  id: string
  entityType: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  legalName?: string | null
  tradeName?: string | null
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erreur inconnue'
}

interface TrustCircleData {
  mutual: TrustRelationItem[]
  unilateral: TrustRelationItem[]
  pending: TrustRelationItem[]
  received: ReceivedTrustRelation[]
  manualEntries: ManualTrustEntry[]
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
  const [activeTab, setActiveTab] = useState<'all' | 'mutual' | 'pending' | 'received' | 'manual'>('all')
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
          (entities as ApiEntityRow[] || []).map((e) => ({
            id: e.id,
            name: e.entityType === 'INDIVIDUAL'
              ? `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email || ''
              : e.legalName || e.tradeName || e.email || '',
            entityType: e.entityType,
          }))
        )
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async (inviteToken: string | null) => {
    if (!inviteToken) {
      alert('Invitation invalide')
      return
    }
    try {
      const res = await fetch(`/api/trust-circle/confirm/${inviteToken}`, {
        method: 'POST',
        credentials: 'include',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || 'Erreur lors de l\'acceptation')
      }
      setToastMessage(
        body.trustType === 'MUTUAL'
          ? 'Contact mutuel certifié'
          : 'Invitation acceptée',
      )
      await fetchTrustCircle()
    } catch (err: unknown) {
      alert(getErrorMessage(err))
    }
  }

  const handleDeclineInvitation = async (id: string) => {
    if (!confirm('Refuser cette invitation Trust Circle ?')) return
    try {
      const res = await fetch(`/api/trust-circle/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'relation' }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erreur lors du refus')
      }
      setToastMessage('Invitation refusée')
      await fetchTrustCircle()
    } catch (err: unknown) {
      alert(getErrorMessage(err))
    }
  }

  const handleDelete = async (id: string, deleteType: 'relation' | 'manual') => {
    if (!confirm('Supprimer ce contact du Trust Circle ?')) return
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
      setToastMessage('Contact supprimé')
      await fetchTrustCircle()
    } catch (err: unknown) {
      alert(getErrorMessage(err))
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 bg-[#0a1628] text-sm text-white/40">
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-[#00d4ff]/30 border-t-[#00d4ff]"
          aria-hidden
        />
        Chargement...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0a1628]">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 bg-[#0a1628] py-20 text-sm text-white/40">
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-[#00d4ff]/30 border-t-[#00d4ff]"
          aria-hidden
        />
        Chargement...
      </div>
    )
  }

  const totalEntites =
    (data.mutual?.length ?? 0) +
    (data.unilateral?.length ?? 0) +
    (data.pending?.length ?? 0) +
    (data.received?.length ?? 0) +
    (data.manualEntries?.length ?? 0)
  const quotaAllowed = data.stats.limit == null || data.stats.current < data.stats.limit

  return (
    <>
        <FeatureOnboardingTooltip feature="trust-circle" />
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
          <div className="min-w-0">
            <h1 className="font-syne text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl mb-2">
              Mon Trust Circle
            </h1>
            <p className="font-mono text-sm text-bt-cyan sm:text-base">
              {data.stats.current} contacts · {(data.mutual?.length ?? 0)} mutuels
            </p>
            <p className="mt-2 mb-4 max-w-2xl text-xs leading-relaxed text-white/40">
              <span className="font-semibold text-white/55">Contacts</span> — personnes ou entreprises que vous
              certifiez dans votre réseau. <span className="font-semibold text-white/55">Trust Circle</span> — relation
              de confiance mutuelle ; protection Cas&nbsp;1 / Cas&nbsp;2. Ajoutez vos contacts certifiés au Trust Circle
              pour activer la protection contre l&apos;usurpation.
            </p>
            <div className="mb-4 max-w-2xl rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/45">
              <p className="mb-2">
                <span className="font-semibold text-emerald-400/90">Protection Cas 1</span> — confiance{' '}
                <span className="font-semibold text-white/60">MUTUELLE</span> : les deux contacts sont sur BLOCKTRUST™
                et se sont mutuellement ajoutés. Niveau de confiance maximal.
              </p>
              <p>
                <span className="font-semibold text-amber-400/90">Protection Cas 2</span> — confiance{' '}
                <span className="font-semibold text-white/60">UNILATÉRALE</span> : vous avez ajouté ce contact mais il
                n&apos;est pas encore sur BLOCKTRUST™ ou ne vous a pas ajouté. Niveau de confiance partiel.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={!quotaAllowed}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-bt-cyan/20 px-4 py-2.5 text-sm font-sans font-semibold text-bt-cyan transition hover:bg-bt-cyan/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-base"
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

        <div className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-white/10 px-1 pb-0.5 sm:gap-2">
          {(['all', 'mutual', 'pending', 'received', 'manual'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3 sm:px-4 py-2 text-sm sm:text-base font-medium transition rounded-t whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-bt-cyan bg-bt-cyan/20 text-bt-cyan'
                  : 'border border-transparent text-white/60 hover:text-white'
              }`}
            >
              {tab === 'all' && `Toutes (${totalEntites})`}
              {tab === 'mutual' && `Mutuelles (${data.mutual?.length ?? 0})`}
              {tab === 'pending' && `En attente (${data.pending?.length ?? 0})`}
              {tab === 'received' && `Invitation reçue (${data.received?.length ?? 0})`}
              {tab === 'manual' && `Manuelles (${data.manualEntries?.length ?? 0})`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {activeTab === 'all' && [
            ...(data.mutual || []).map((r) => (
              <Card key={r.id} type="mutual" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
            )),
            ...(data.unilateral || []).map((r) => (
              <Card key={r.id} type="unilateral" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
            )),
            ...(data.pending || []).map((r) => (
              <Card key={r.id} type="pending" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
            )),
            ...(data.received || []).map((r) => (
              <ReceivedCard
                key={r.id}
                data={r}
                onAccept={() => handleAcceptInvitation(r.inviteToken)}
                onDecline={() => handleDeclineInvitation(r.id)}
              />
            )),
            ...(data.manualEntries || []).map((e) => (
              <Card key={e.id} type="manual" data={e} onDelete={() => handleDelete(e.id, 'manual')} />
            )),
          ]}
          {activeTab === 'mutual' && (data.mutual || []).map((r) => (
            <Card key={r.id} type="mutual" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
          ))}
          {activeTab === 'pending' && (data.pending || []).map((r) => (
            <Card key={r.id} type="pending" data={r} onDelete={() => handleDelete(r.id, 'relation')} />
          ))}
          {activeTab === 'received' && (data.received || []).map((r) => (
            <ReceivedCard
              key={r.id}
              data={r}
              onAccept={() => handleAcceptInvitation(r.inviteToken)}
              onDecline={() => handleDeclineInvitation(r.id)}
            />
          ))}
          {activeTab === 'manual' && (data.manualEntries || []).map((e) => (
            <Card key={e.id} type="manual" data={e} onDelete={() => handleDelete(e.id, 'manual')} />
          ))}
        </div>

        {totalEntites === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-lg transition-all hover:border-gold/30">
            <Link2 className="mx-auto mb-4 h-12 w-12 text-white/20" aria-hidden />
            <h3 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">Aucun contact</h3>
            <p className="mb-6 text-white/60">Ajoutez des contacts à votre cercle de confiance</p>
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={!quotaAllowed}
              className="rounded-lg bg-bt-cyan py-3 px-6 font-sans font-bold text-navy transition-all hover:bg-bt-cyan/90 disabled:opacity-50"
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

function Card({ type, data, onDelete }: { type: 'mutual' | 'unilateral' | 'pending' | 'manual'; data: TrustCircleCardData; onDelete?: () => void }) {
  const relation = 'toUser' in data ? data as TrustRelationItem : null
  const manual = 'entityName' in data ? data as ManualTrustEntry : null
  const name = relation?.toUser?.name || relation?.toName || manual?.entityName || relation?.toEmail || manual?.toEmail || manual?.entityEmail || '—'
  const email = relation?.toUser?.email || relation?.toEmail || manual?.entityEmail || manual?.toEmail
  return (
    <div
      className="p-3 sm:p-4 rounded-xl border"
      style={{
        borderColor:
          type === 'mutual'
            ? 'rgba(16,185,129,0.45)'
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
          {type === 'mutual' && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              Contact mutuel certifié
            </span>
          )}
          {type === 'unilateral' && <span className="rounded bg-bt-cyan/10 px-2 py-0.5 text-[9px] text-bt-cyan/90">Unilatérale</span>}
          {type === 'pending' && <span className="text-[9px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded">En attente</span>}
          {type === 'manual' && <span className="text-[9px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Vérifié admin</span>}
          <h3 className="font-syne mt-1 break-words text-base font-bold text-white sm:text-lg">{name}</h3>
          {email && <p className="text-xs sm:text-sm text-gray-400 break-all">{email}</p>}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Supprimer du Trust Circle"
            className="p-1.5 rounded-md text-red-400/55 hover:text-red-400 hover:bg-red-500/15 transition-colors shrink-0"
            aria-label="Supprimer ce contact du Trust Circle"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  )
}

function ReceivedCard({
  data,
  onAccept,
  onDecline,
}: {
  data: ReceivedTrustRelation
  onAccept: () => void
  onDecline: () => void
}) {
  const name = data.fromUser?.name || data.fromUser?.email || '—'
  const email = data.fromUser?.email
  return (
    <div
      className="p-3 sm:p-4 rounded-xl border"
      style={{
        borderColor: 'rgba(245,158,11,0.35)',
        background: 'rgba(13,31,60,0.8)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
            Invitation reçue
          </span>
          <h3 className="font-syne mt-1 break-words text-base font-bold text-white sm:text-lg">{name}</h3>
          {email && <p className="text-xs sm:text-sm text-gray-400 break-all">{email}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onDecline}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 sm:text-sm"
          >
            <X size={14} aria-hidden />
            Refuser
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/25 sm:text-sm"
          >
            <Check size={14} aria-hidden />
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
