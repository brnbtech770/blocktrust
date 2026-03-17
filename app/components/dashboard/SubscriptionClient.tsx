// app/components/dashboard/SubscriptionClient.tsx
// Composant client pour gérer l'abonnement (Stripe Portal)
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubscriptionClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleManageSubscription = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ouverture du portail')
      }

      // Rediriger vers le portail Stripe
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      alert(`Erreur : ${error.message}`)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleManageSubscription}
      disabled={loading}
      className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? '⏳ Ouverture...' : '⚙️ Gérer mon abonnement'}
    </button>
  )
}
