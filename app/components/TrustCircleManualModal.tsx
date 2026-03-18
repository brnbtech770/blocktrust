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
  const [entityName, setEntityName] = useState('')
  const [entityEmail, setEntityEmail] = useState('')
  const [entityType, setEntityType] = useState<'INDIVIDUAL' | 'BUSINESS' | 'DOMAIN' | 'EMAIL'>('INDIVIDUAL')
  const [siret, setSiret] = useState('')
  const [notes, setNotes] = useState('')
  const [documents, setDocuments] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.set('file', file)
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload échoué')
      setDocuments((d) => [...d, data.url])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (documents.length === 0) {
      setError('Veuillez joindre au moins un document (JPG, PNG ou PDF).')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/trust-circle/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entityName,
          entityEmail: entityEmail || undefined,
          entityType,
          siret: siret.length === 14 ? siret : undefined,
          documents,
          note: notes || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (data.error === 'QUOTA_EXCEEDED') throw new Error('Limite atteinte. Passez à un plan supérieur.')
        throw new Error(data.error || 'Erreur lors de l\'ajout')
      }
      onSuccess()
      onClose()
      setEntityName('')
      setEntityEmail('')
      setSiret('')
      setNotes('')
      setDocuments([])
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Nom de l&apos;entité <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              required
              placeholder="Nom entreprise ou personne"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email (optionnel)</label>
            <input
              type="email"
              value={entityEmail}
              onChange={(e) => setEntityEmail(e.target.value)}
              placeholder="contact@example.com"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">SIRET (optionnel, 14 chiffres)</label>
            <input
              type="text"
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="12345678901234"
              maxLength={14}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Documents <span className="text-red-400">*</span> (JPG, PNG, PDF, max 10 Mo)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={onFileChange}
              disabled={uploading}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-cyan-500 file:text-white"
            />
            {documents.length > 0 && <p className="text-xs text-green-400 mt-1">{documents.length} fichier(s) joint(s)</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Note pour l&apos;admin (optionnel)</label>
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
