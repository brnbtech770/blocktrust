'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserData {
  id: string
  email: string
  name: string | null
  image: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      // TODO: Remplacer par un appel API dédié quand l'auth sera implémentée
      // Pour l'instant, on récupère depuis localStorage ou cookies
      const userId = localStorage.getItem('user-id') || document.cookie
        .split('; ')
        .find(row => row.startsWith('user-id='))
        ?.split('=')[1]

      if (!userId) {
        router.push('/')
        return
      }

      // Simuler les données utilisateur (à remplacer par un vrai appel API)
      const userData: UserData = {
        id: userId,
        email: localStorage.getItem('user-email') || 'user@example.com',
        name: localStorage.getItem('user-name') || null,
        image: localStorage.getItem('user-image') || null,
      }

      setUser(userData)
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    // Nettoyer les données de session
    localStorage.removeItem('user-id')
    localStorage.removeItem('user-email')
    localStorage.removeItem('user-name')
    localStorage.removeItem('user-image')
    
    // Supprimer les cookies
    document.cookie = 'user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    
    // Rediriger vers la page d'accueil
    router.push('/')
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
            onClick={fetchUserData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 tracking-tight">Paramètres</h1>

        {/* Profil */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Informations du profil</h2>
          <div className="space-y-4">
            {/* Image de profil */}
            <div className="flex items-center space-x-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-2xl text-gray-600">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <button className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                  Changer la photo
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG ou GIF. Max 1MB.
                </p>
              </div>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                Nom
              </label>
              <input
                type="text"
                value={user.name || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                placeholder="Votre nom"
              />
              <p className="text-xs text-gray-500 mt-1">
                TODO: Implémenter la modification du nom
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>
          </div>
        </div>

        {/* Préférences de notification */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Préférences de notification
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-700">Emails de facturation</p>
                <p className="text-sm text-gray-500">
                  Recevoir des emails concernant vos factures
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-700">Notifications produit</p>
                <p className="text-sm text-gray-500">
                  Recevoir des mises à jour sur les nouvelles fonctionnalités
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-700">Alertes de sécurité</p>
                <p className="text-sm text-gray-500">
                  Recevoir des alertes pour les activités suspectes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            ⚠️ Les préférences de notification sont des placeholders pour l'instant
          </p>
        </div>

        {/* Bouton déconnexion */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Danger Zone</h2>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
