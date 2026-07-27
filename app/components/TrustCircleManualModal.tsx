// app/components/TrustCircleManualModal.tsx
// Modal pour ajouter une entrée manuelle au Trust Circle
// ============================================================

'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'

interface TrustCircleManualModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userEntities: Array<{ id: string; name: string; entityType: string }>
}

type TrustCircleEntityType = 'INDIVIDUAL' | 'BUSINESS' | 'DOMAIN' | 'EMAIL'

export default function TrustCircleManualModal({
  isOpen,
  onClose,
  onSuccess,
  userEntities: _userEntities,
}: TrustCircleManualModalProps) {
  const [entityName, setEntityName] = useState('')
  const [entityEmail, setEntityEmail] = useState('')
  const [entityType, setEntityType] = useState<TrustCircleEntityType>('INDIVIDUAL')
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
      form.set('purpose', 'trust-manual')
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload échoué')
      // Blob privé : on persiste le `pathname` (relecture via endpoint admin gardé),
      // pas l'URL publique. Fallback sur url pour rétro-compat.
      setDocuments((d) => [...d, data.pathname || data.url])
      // Reset input pour permettre de re-uploader le même fichier
      e.target.value = ''
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-syne text-xl font-bold tracking-tight text-white">Ajouter une entrée manuelle</h3>
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
            <label className="mb-2 block text-sm font-medium text-white/70">Nom du contact <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              required
              placeholder="Nom entreprise ou personne"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Email (optionnel)</label>
            <input
              type="email"
              value={entityEmail}
              onChange={(e) => setEntityEmail(e.target.value)}
              placeholder="contact@example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Type</label>
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
            <label className="mb-2 block text-sm font-medium text-white/70">SIRET (optionnel, 14 chiffres)</label>
            <input
              type="text"
              value={siret}
              onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="12345678901234"
              maxLength={14}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Documents <span className="text-red-400">*</span>{' '}
              <span className="text-xs text-white/40">(JPG, PNG, WEBP, PDF — max 10 Mo)</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={onFileChange}
              disabled={uploading}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white file:mr-2 file:rounded file:border-0 file:bg-bt-cyan file:px-3 file:py-1 file:font-medium file:text-navy"
            />
            {uploading && <p className="text-xs text-bt-cyan/80 mt-1">Upload en cours…</p>}
            {documents.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {documents.map((url, i) => (
                  <li key={url} className="flex items-center justify-between gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-1 text-emerald-300">
                    <span className="truncate">Document {i + 1} joint</span>
                    <button
                      type="button"
                      onClick={() => setDocuments((d) => d.filter((u) => u !== url))}
                      className="text-emerald-400/70 hover:text-red-400"
                      aria-label="Retirer ce document"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">Note pour l&apos;admin (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes..."
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-bt-cyan/40"
            />
            <p className="mt-1 text-xs text-white/40">{notes.length}/1000</p>
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
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/20 py-2 px-4 font-medium text-gold transition hover:border-gold/60 hover:bg-gold/30 disabled:opacity-50"
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
