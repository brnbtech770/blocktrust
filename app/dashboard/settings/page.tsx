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
      <div className="flex min-h-[40vh] items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-bt-cyan border-t-transparent" />
          <p className="mt-4 text-sm text-white/60">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-12">
        <div className="text-center">
          <p className="mb-4 text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchUserData}
            className="rounded-lg bg-bt-cyan px-4 py-2 text-sm font-semibold text-navy transition hover:bg-bt-cyan/90"
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

  const toggleTrack =
    'relative h-6 w-11 shrink-0 rounded-full bg-white/15 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[""] peer-checked:bg-bt-cyan peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bt-cyan/25 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--bt-navy)]'

  return (
    <div className="py-8 text-white/80">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-syne mb-8 text-4xl font-bold tracking-tight text-white">Paramètres</h1>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">Informations du profil</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <span className="text-2xl text-white/80">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <button
                  type="button"
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 transition hover:bg-white/5"
                >
                  Changer la photo
                </button>
                <p className="mt-1 text-xs text-white/45">JPG, PNG ou GIF. Max 1MB.</p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-base font-semibold text-white/90">Nom</label>
              <input
                type="text"
                value={user.name || ''}
                readOnly
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                placeholder="Votre nom"
              />
              <p className="mt-1 text-xs text-white/45">TODO: Implémenter la modification du nom</p>
            </div>

            <div>
              <label className="mb-2 block text-base font-semibold text-white/90">Email</label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
              <p className="mt-1 text-xs text-white/45">L&apos;email ne peut pas être modifié</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">
            Préférences de notification
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white/90">Emails de facturation</p>
                <p className="text-sm text-white/50">Recevoir des emails concernant vos factures</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className={toggleTrack} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white/90">Notifications produit</p>
                <p className="text-sm text-white/50">Recevoir des mises à jour sur les nouvelles fonctionnalités</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className={toggleTrack} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white/90">Alertes de sécurité</p>
                <p className="text-sm text-white/50">Recevoir des alertes pour les activités suspectes</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className={toggleTrack} />
              </label>
            </div>
          </div>
          <p className="mt-4 text-xs text-white/45">
            Les préférences de notification sont des placeholders pour l&apos;instant
          </p>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-white/5 p-6 transition-all hover:border-red-500/50">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">Zone sensible</h2>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-6 py-2 text-white transition hover:bg-red-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
