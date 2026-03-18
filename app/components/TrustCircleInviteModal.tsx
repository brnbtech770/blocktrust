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

export default function TrustCircleInviteModal({
  isOpen,
  onClose,
  onSuccess,
  userEntities,
}: TrustCircleInviteModalProps) {
  const [toEmail, setToEmail] = useState('')
  const [toName, setToName] = useState('')
  const [entityType, setEntityType] = useState<'INDIVIDUAL' | 'BUSINESS' | 'DOMAIN' | 'EMAIL'>('INDIVIDUAL')
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Inviter une entité</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                required
                placeholder="contact@example.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
            <input
              type="text"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Nom ou raison sociale"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type d&apos;entité</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as any)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="INDIVIDUAL">Particulier</option>
              <option value="BUSINESS">Entreprise</option>
              <option value="DOMAIN">Domaine</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Note (optionnel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Message ou note..."
              rows={2}
              maxLength={500}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-cyan-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-cyan-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Envoi...'
              ) : (
                <>
                  <Send size={18} />
                  Envoyer l'invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
