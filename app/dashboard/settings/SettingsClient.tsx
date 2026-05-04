'use client'

import SignOutButton from '@/app/components/SignOutButton'

export type SettingsClientUser = {
  email: string
  name: string | null
  image: string | null
}

export default function SettingsClient({ user }: { user: SettingsClientUser }) {
  const toggleTrack =
    'relative h-6 w-11 shrink-0 rounded-full bg-white/15 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[""] peer-checked:bg-bt-cyan peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bt-cyan/25 peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--bt-navy)]'

  return (
    <div className="py-8 text-white/80">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-syne mb-8 text-4xl font-bold tracking-tight text-white drop-shadow-none">
          Paramètres
        </h1>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">
            Informations du profil
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              {user.image ? (
                <img src={user.image} alt="" className="h-16 w-16 rounded-full" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <span className="text-2xl text-white/80">
                    {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
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
              <p className="mt-1 text-xs text-white/45">Modification du nom à venir.</p>
            </div>

            <div>
              <label className="mb-2 block text-base font-semibold text-white/90">Email</label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
              <p className="mt-1 text-xs text-white/45">L&apos;email ne peut pas être modifié.</p>
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
            Les préférences de notification sont des placeholders pour l&apos;instant.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-red-500/40">
          <h2 className="font-syne mb-4 text-2xl font-semibold tracking-tight text-white">Session</h2>
          <p className="mb-4 text-sm text-white/55">Déconnexion sécurisée via votre compte BlockTrust.</p>
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
