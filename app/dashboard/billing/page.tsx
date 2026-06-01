'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SubscriptionData {
  hasSubscription: boolean
  plan: string
  planLabel?: string
  planCode?: string
  subscription: {
    id: string
    status: string
    currentPeriodEnd: string
    trialEnd: string | null
    cancelAtPeriodEnd: boolean
    cancelAt: string | null
  } | null
  usage: {
    entitiesCount: number
    certificatesThisMonth: number
  }
  limits: {
    maxEntities: number
    maxCertificates: number
    trustCircleEnabled: boolean
    blockchainAnchor: boolean
  } | null
}

export default function BillingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      // Récupérer l'ID utilisateur depuis localStorage ou cookie
      const userId = localStorage.getItem('user-id') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('user-id='))
          ?.split('=')[1]

      if (!userId) {
        setError('Vous devez être connecté pour voir vos informations de facturation')
        setLoading(false)
        return
      }

      const response = await fetch('/api/stripe/subscription', {
        headers: {
          'x-user-id': userId,
        },
        credentials: 'include', // Inclure les cookies
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.error || 'Erreur lors de la récupération des données')
      }
      
      const subscriptionData = await response.json()
      setData(subscriptionData)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      // Récupérer l'ID utilisateur depuis localStorage ou cookie
      const userId = localStorage.getItem('user-id') || 
        document.cookie
          .split('; ')
          .find(row => row.startsWith('user-id='))
          ?.split('=')[1]

      if (!userId) {
        alert('Vous devez être connecté pour gérer votre abonnement')
        setPortalLoading(false)
        return
      }

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
        },
        credentials: 'include', // Inclure les cookies
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.error || 'Erreur lors de la création de la session portail')
      }
      
      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'ouverture du portail')
      setPortalLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchSubscriptionData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 tracking-tight">Facturation</h1>

        {/* Plan actuel */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Plan actuel</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {data.planLabel ?? 'Découverte'}
              </p>
              {data.subscription && (
                <div className="mt-3 space-y-2">
                  <p className="text-base text-gray-600">
                    Statut: <span className="font-semibold">{data.subscription.status}</span>
                  </p>
                  <p className="text-base text-gray-600">
                    Période actuelle jusqu'au:{' '}
                    <span className="font-semibold">
                      {formatDate(data.subscription.currentPeriodEnd)}
                    </span>
                  </p>
                  {data.subscription.cancelAtPeriodEnd && (
                    <p className="text-base text-orange-600 font-semibold">
                      ⚠️ Annulation prévue à la fin de la période
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading || !data.hasSubscription}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {portalLoading ? 'Chargement...' : 'Gérer mon abonnement'}
            </button>
          </div>
        </div>

        {/* Usage */}
        {data.limits && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Utilisation</h2>
            <div className="space-y-4">
              {/* Contacts */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Contacts</span>
                  <span className="text-sm text-gray-600">
                    {data.usage.entitiesCount} / {data.limits.maxEntities === 999999 ? '∞' : data.limits.maxEntities}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${
                        data.limits.maxEntities === 999999
                          ? 0
                          : Math.min((data.usage.entitiesCount / data.limits.maxEntities) * 100, 100)
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Certificats ce mois-ci */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Certificats ce mois-ci
                  </span>
                  <span className="text-sm text-gray-600">
                    {data.usage.certificatesThisMonth} /{' '}
                    {data.limits.maxCertificates === 999999
                      ? '∞'
                      : data.limits.maxCertificates}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${
                        data.limits.maxCertificates === 999999
                          ? 0
                          : Math.min(
                              (data.usage.certificatesThisMonth / data.limits.maxCertificates) * 100,
                              100
                            )
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fonctionnalités */}
        {data.limits && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Fonctionnalités</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className={`mr-2 ${data.limits.trustCircleEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {data.limits.trustCircleEnabled ? '✓' : '✗'}
                </span>
                <span className="text-base text-gray-700 font-medium">Trust Circle</span>
              </div>
              <div className="flex items-center">
                <span className={`mr-2 ${data.limits.blockchainAnchor ? 'text-green-600' : 'text-gray-400'}`}>
                  {data.limits.blockchainAnchor ? '✓' : '✗'}
                </span>
                <span className="text-base text-gray-700 font-medium">Ancrage blockchain</span>
              </div>
            </div>
          </div>
        )}

        {/* Bouton pour changer de plan */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/pricing')}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Voir les plans disponibles
          </button>
        </div>
      </div>
    </div>
  )
}
