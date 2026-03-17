// app/components/TrustCircleManualModal.tsx
// Modal pour ajouter une entrée manuelle au Trust Circle
// ============================================================

'use client'

import { useState } from 'react'
import { X, UserPlus, Save } from 'lucide-react'

interface TrustCircleManualModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userEntities: Array<{ id: string; name: string; entityType: string }>
}

export default function TrustCircleManualModal({
  isOpen,
  onClose,
  onSuccess,
  userEntities,
}: TrustCircleManualModalProps) {
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [trustedName, setTrustedName] = useState('')
  const [trustedEmail, setTrustedEmail] = useState('')
  const [trustedPhone, setTrustedPhone] = useState('')
  const [trustedDomain, setTrustedDomain] = useState('')
  const [trustedSiret, setTrustedSiret] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/trust-circle/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ownerEntityId: selectedEntityId,
          trustedName,
          trustedEmail: trustedEmail || undefined,
          trustedPhone: trustedPhone || undefined,
          trustedDomain: trustedDomain || undefined,
          trustedSiret: trustedSiret || undefined,
          category: category || undefined,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'ajout')
      }

      onSuccess()
      onClose()
      // Reset form
      setSelectedEntityId('')
      setTrustedName('')
      setTrustedEmail('')
      setTrustedPhone('')
      setTrustedDomain('')
      setTrustedSiret('')
      setCategory('')
      setNotes('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Ajouter une entrée manuelle</h3>
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
              Nom de l'entité <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={trustedName}
              onChange={(e) => setTrustedName(e.target.value)}
              required
              placeholder="Nom de l'entreprise ou personne"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email (optionnel)
              </label>
              <input
                type="email"
                value={trustedEmail}
                onChange={(e) => setTrustedEmail(e.target.value)}
                placeholder="contact@example.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Téléphone (optionnel)
              </label>
              <input
                type="tel"
                value={trustedPhone}
                onChange={(e) => setTrustedPhone(e.target.value)}
                placeholder="+33 1 23 45 67 89"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Domaine (optionnel)
              </label>
              <input
                type="text"
                value={trustedDomain}
                onChange={(e) => setTrustedDomain(e.target.value)}
                placeholder="example.com"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                SIRET (optionnel)
              </label>
              <input
                type="text"
                value={trustedSiret}
                onChange={(e) => setTrustedSiret(e.target.value)}
                placeholder="12345678901234"
                maxLength={14}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Catégorie (optionnel)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Aucune</option>
              <option value="banque">Banque</option>
              <option value="fournisseur">Fournisseur</option>
              <option value="client">Client</option>
              <option value="partenaire">Partenaire</option>
              <option value="administration">Administration</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes..."
              rows={3}
              maxLength={1000}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{notes.length}/1000</p>
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
              className="flex-1 bg-purple-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-purple-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Ajout...'
              ) : (
                <>
                  <Save size={18} />
                  Ajouter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
