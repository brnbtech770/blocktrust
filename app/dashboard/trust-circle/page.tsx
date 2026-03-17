// app/dashboard/trust-circle/page.tsx
// Réseau de confiance de l'utilisateur
// Visible uniquement si plan.trustCircleEnabled === true
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, UserPlus, Mail, X, Check, XCircle } from 'lucide-react'
import TrustCircleInviteModal from '@/app/components/TrustCircleInviteModal'
import TrustCircleManualModal from '@/app/components/TrustCircleManualModal'

interface TrustRelation {
  id: string
  type: 'mutual'
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED'
  direction: 'incoming' | 'outgoing'
  otherParty: {
    id: string
    name: string
    email: string
    logoUrl?: string
    entityType: string
  }
  relationshipType?: string
  message?: string
  createdAt: string
  respondedAt?: string
}

interface ManualEntry {
  id: string
  type: 'manual'
  name: string
  email?: string
  phone?: string
  domain?: string
  siret?: string
  category?: string
  notes?: string
  emailVerified: boolean
  domainVerified: boolean
  createdAt: string
}

interface TrustCircleData {
  relations: TrustRelation[]
  manual: ManualEntry[]
  stats: {
    totalMutual: number
    totalManual: number
    pending: number
  }
}

export default function TrustCirclePage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [data, setData] = useState<TrustCircleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'mutual' | 'manual'>('mutual')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [userEntities, setUserEntities] = useState<Array<{ id: string; name: string; entityType: string }>>([])

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

  const [plan, setPlan] = useState<{ trustCircleEnabled: boolean } | null>(null)

  const fetchTrustCircle = async () => {
    try {
      setLoading(true)
      
      // Vérifier d'abord le plan
      const planResponse = await fetch('/api/stripe/subscription', {
        credentials: 'include',
      })
      if (planResponse.ok) {
        const planData = await planResponse.json()
        setPlan(planData.plan)
        
        if (!planData.plan?.trustCircleEnabled) {
          setLoading(false)
          return
        }
      }

      const response = await fetch('/api/trust-circle', {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 403) {
          // Plan limit
          setLoading(false)
          return
        }
        throw new Error('Erreur lors du chargement')
      }

      const data = await response.json()
      setData(data)

      // Récupérer les entités de l'utilisateur pour les modals
      const entitiesResponse = await fetch('/api/entities', {
        credentials: 'include',
      })
      if (entitiesResponse.ok) {
        const entities = await entitiesResponse.json()
        setUserEntities(
          entities.map((e: any) => ({
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

  const handleRespond = async (relationId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/trust-circle/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ relationId, action }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la réponse')
      }

      await fetchTrustCircle()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: string, type: 'mutual' | 'manual') => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette relation ?')) {
      return
    }

    try {
      const response = await fetch(`/api/trust-circle/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

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

  // Si le plan ne permet pas Trust Circle
  if (plan && !plan.trustCircleEnabled) {
    return (
      <>
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            Trust Circle non disponible
          </h2>
          <p className="text-gray-400 text-base mb-6">
            Disponible avec Famille+ ou Team
          </p>
          <Link
            href="/pricing?feature=trustCircle"
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            Passer au plan supérieur
          </Link>
        </div>
      </>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  return (
    <>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Trust Circle</h1>
            <p className="text-gray-400 text-base">Gérez votre réseau de confiance</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition flex items-center gap-2"
            >
              <UserPlus size={18} />
              Inviter une entité
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition flex items-center gap-2"
            >
              <Users size={18} />
              Ajouter manuellement
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-base font-medium mb-2">Relations mutuelles</p>
            <p className="text-5xl font-bold text-cyan-400 tracking-tight">{data.stats.totalMutual}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-base font-medium mb-2">Entrées manuelles</p>
            <p className="text-5xl font-bold text-purple-400 tracking-tight">{data.stats.totalManual}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-base font-medium mb-2">En attente</p>
            <p className="text-5xl font-bold text-yellow-400 tracking-tight">{data.stats.pending}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('mutual')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'mutual'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mes relations ({data.relations.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'manual'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Entrées manuelles ({data.manual.length})
          </button>
        </div>

        {/* Contenu */}
        {activeTab === 'mutual' ? (
          <div className="space-y-4">
            {data.relations.length > 0 ? (
              data.relations.map((relation) => (
                <div
                  key={relation.id}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-white">{relation.otherParty.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          relation.status === 'ACCEPTED'
                            ? 'bg-green-500/20 text-green-400'
                            : relation.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : relation.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {relation.status === 'ACCEPTED' && '✅ Accepté'}
                          {relation.status === 'PENDING' && '⏳ En attente'}
                          {relation.status === 'REJECTED' && '❌ Rejeté'}
                          {relation.status === 'REVOKED' && '🚫 Révoqué'}
                        </span>
                        {relation.direction === 'outgoing' && (
                          <span className="text-gray-500 text-xs">→ Sortant</span>
                        )}
                        {relation.direction === 'incoming' && (
                          <span className="text-gray-500 text-xs">← Entrant</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-base mb-2">{relation.otherParty.email}</p>
                      {relation.message && (
                        <p className="text-gray-300 text-base mb-2">"{relation.message}"</p>
                      )}
                      {relation.relationshipType && (
                        <span className="inline-block px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                          {relation.relationshipType}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {relation.status === 'PENDING' && relation.direction === 'incoming' && (
                        <>
                          <button
                            onClick={() => handleRespond(relation.id, 'accept')}
                            className="bg-green-500/20 text-green-400 px-3 py-1 rounded hover:bg-green-500/30 transition text-sm flex items-center gap-1"
                          >
                            <Check size={16} />
                            Accepter
                          </button>
                          <button
                            onClick={() => handleRespond(relation.id, 'reject')}
                            className="bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30 transition text-sm flex items-center gap-1"
                          >
                            <XCircle size={16} />
                            Rejeter
                          </button>
                        </>
                      )}
                      {(relation.status === 'ACCEPTED' || relation.status === 'REJECTED') && (
                        <button
                          onClick={() => handleDelete(relation.id, 'mutual')}
                          className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded hover:bg-gray-500/30 transition text-sm flex items-center gap-1"
                        >
                          <X size={16} />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-bold text-white mb-2">Aucune relation</h3>
                <p className="text-gray-400 mb-6">Invitez une entité BlockTrust à rejoindre votre réseau de confiance</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Inviter une entité
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {data.manual.length > 0 ? (
              data.manual.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-2">{entry.name}</h3>
                      <div className="space-y-1 text-base text-gray-400">
                        {entry.email && <p>📧 {entry.email} {entry.emailVerified && '✓'}</p>}
                        {entry.phone && <p>📱 {entry.phone}</p>}
                        {entry.domain && <p>🌐 {entry.domain} {entry.domainVerified && '✓'}</p>}
                        {entry.siret && <p>🏢 SIRET: {entry.siret}</p>}
                        {entry.category && <p>📁 {entry.category}</p>}
                        {entry.notes && <p className="text-gray-300 mt-2">{entry.notes}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id, 'manual')}
                      className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded hover:bg-gray-500/30 transition text-sm flex items-center gap-1"
                    >
                      <X size={16} />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-white mb-2">Aucune entrée manuelle</h3>
                <p className="text-gray-400 mb-6">Ajoutez des entités externes à votre réseau de confiance</p>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="bg-purple-500 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Ajouter manuellement
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
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
    </>
  )
}
