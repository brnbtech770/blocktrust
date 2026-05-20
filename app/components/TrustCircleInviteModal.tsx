// app/components/TrustCircleInviteModal.tsx
// Modal pour inviter une entité au Trust Circle
// ============================================================

'use client'

import { useState } from 'react'
import { X, Mail, Send } from 'lucide-react'

interface TrustCircleInviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userEntities: Array<{ id: string; name: string; entityType: string }>
}

type TrustCircleEntityType = 'INDIVIDUAL' | 'BUSINESS' | 'DOMAIN' | 'EMAIL'

export default function TrustCircleInviteModal({
  isOpen,
  onClose,
  onSuccess,
  userEntities,
}: TrustCircleInviteModalProps) {
  const [toEmail, setToEmail] = useState('')
  const [toName, setToName] = useState('')
  const [entityType, setEntityType] = useState<TrustCircleEntityType>('INDIVIDUAL')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/trust-circle/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: toEmail,
          name: toName || toEmail,
          entityType,
          note: note || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (data.error === 'QUOTA_EXCEEDED') {
          throw new Error(`Limite atteinte (${data.current}/${data.limit}). Passez à un plan supérieur.`)
        }
        throw new Error(data.error || data.message || 'Erreur lors de l\'invitation')
      }

      onSuccess()
      onClose()
      setToEmail('')
      setToName('')
      setNote('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-syne text-xl font-bold tracking-tight text-white">Inviter un contact</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 transition hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                required
                placeholder="contact@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Nom</label>
            <input
              type="text"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Nom ou raison sociale"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Type de contact</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as TrustCircleEntityType)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
            >
              <option value="INDIVIDUAL">Particulier</option>
              <option value="BUSINESS">Entreprise</option>
              <option value="DOMAIN">Domaine</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Note (optionnel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Message ou note..."
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/20 py-2 px-4 font-medium text-white/90 transition hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-bt-cyan py-2 px-4 font-medium text-navy transition hover:bg-bt-cyan/90 disabled:opacity-50"
            >
              {loading ? (
                'Envoi...'
              ) : (
                <>
                  <Send size={18} />
                  Envoyer l&apos;invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
