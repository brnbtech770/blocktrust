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
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [toEmail, setToEmail] = useState('')
  const [relationshipType, setRelationshipType] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/trust-circle/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromEntityId: selectedEntityId,
          toEmail,
          relationshipType: relationshipType || undefined,
          message: message || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'invitation')
      }

      onSuccess()
      onClose()
      // Reset form
      setSelectedEntityId('')
      setToEmail('')
      setRelationshipType('')
      setMessage('')
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mon entité
            </label>
            <select
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Sélectionner une entité</option>
              {userEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name} ({entity.entityType === 'INDIVIDUAL' ? 'B2C' : 'B2B'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email de l'entité à inviter
            </label>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type de relation (optionnel)
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Aucun</option>
              <option value="client">Client</option>
              <option value="fournisseur">Fournisseur</option>
              <option value="partenaire">Partenaire</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message (optionnel)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ajoutez un message personnalisé..."
              rows={3}
              maxLength={500}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/500</p>
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
