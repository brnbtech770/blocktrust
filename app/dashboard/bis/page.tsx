'use client'

/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * Dashboard — signatures BIS (envoyées / reçues + formulaire)
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Copy,
  FileSignature,
  FileUp,
  Loader2,
  Send,
  X,
} from 'lucide-react'
import {
  BisSignSuccessPanel,
  type BisSignSuccessData,
} from '@/app/components/bis/BisSignSuccessPanel'
import { BIS_INTERACTION_TYPES, isValidContentHash } from '@/lib/bis-access'
import {
  BIS_FILE_ACCEPT_ATTR,
  BIS_MAX_FILE_BYTES,
  formatBisFileSize,
  isAcceptedBisFile,
  sha256File,
  sha256Text,
} from '@/lib/bis-content-hash'
import { getBisInteractionLabel } from '@/lib/bis-interaction-labels'

type BisListItem = {
  id: string
  recipientEmail?: string
  senderEmail?: string
  interactionType: string
  contextLabel: string | null
  contentHash: string
  bisLevel: number
  verified: boolean
  verifiedAt: string | null
  createdAt: string
  expiresAt: string
  verifyUrl: string
  signature?: string
}

const INITIAL_FORM = {
  recipientEmail: '',
  interactionType: 'EMAIL',
  contextLabel: '',
  content: '',
  manualHash: '',
  notifyRecipient: true,
}

export default function BisDashboardPage() {
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const [tab, setTab] = useState<'sent' | 'received' | 'sign'>('sent')
  const [sent, setSent] = useState<BisListItem[]>([])
  const [received, setReceived] = useState<BisListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signing, setSigning] = useState(false)
  const [signResult, setSignResult] = useState<BisSignSuccessData | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const [recipientEmail, setRecipientEmail] = useState(INITIAL_FORM.recipientEmail)
  const [interactionType, setInteractionType] = useState(INITIAL_FORM.interactionType)
  const [contextLabel, setContextLabel] = useState(INITIAL_FORM.contextLabel)
  const [content, setContent] = useState(INITIAL_FORM.content)
  const [manualHash, setManualHash] = useState(INITIAL_FORM.manualHash)
  const [notifyRecipient, setNotifyRecipient] = useState(INITIAL_FORM.notifyRecipient)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [hashingFile, setHashingFile] = useState(false)
  const [fileError, setFileError] = useState('')

  const loadLists = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [sentRes, recvRes] = await Promise.all([
        fetch('/api/bis/my-signatures', { credentials: 'include' }),
        fetch('/api/bis/received', { credentials: 'include' }),
      ])
      if (sentRes.status === 403 || recvRes.status === 403) {
        router.replace(
          `/pricing?feature=bis&message=${encodeURIComponent(
            'Abonnez-vous à une offre avec certificat ancré pour utiliser les signatures BIS.',
          )}`,
        )
        return
      }
      if (!sentRes.ok || !recvRes.ok) throw new Error('Erreur de chargement')
      const sentData = await sentRes.json()
      const recvData = await recvRes.json()
      setSent(sentData.items ?? [])
      setReceived(recvData.items ?? [])
    } catch {
      setError('Impossible de charger les signatures BIS')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard/bis')
      return
    }
    if (sessionStatus === 'authenticated') loadLists()
  }, [sessionStatus, router, loadLists])

  const clearSelectedFile = () => {
    setSelectedFile(null)
    setFileError('')
    const input = document.getElementById('bisDocumentFile') as HTMLInputElement | null
    if (input) input.value = ''
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFileError('')
    setSelectedFile(null)
    setManualHash('')
    if (!file) return

    if (!isAcceptedBisFile(file)) {
      setFileError('Format non accepté. Utilisez PDF, PNG, JPG, DOCX, XLSX ou TXT.')
      e.target.value = ''
      return
    }
    if (file.size > BIS_MAX_FILE_BYTES) {
      setFileError('Fichier trop volumineux (max 10 Mo).')
      e.target.value = ''
      return
    }

    setHashingFile(true)
    try {
      const hash = await sha256File(file)
      setSelectedFile(file)
      setManualHash(hash)
      setContent('')
      setInteractionType('DOCUMENT')
    } catch {
      setFileError('Impossible de calculer l’empreinte du fichier.')
      e.target.value = ''
    } finally {
      setHashingFile(false)
    }
  }

  const resolveContentHash = async (): Promise<string> => {
    const manual = manualHash.trim().toLowerCase()
    if (manual) {
      if (!isValidContentHash(manual)) {
        throw new Error('Empreinte SHA-256 invalide (64 caractères hexadécimaux attendus)')
      }
      return manual
    }
    if (content.trim()) return sha256Text(content)
    throw new Error('Ajoutez un document, une empreinte SHA-256 ou un contenu texte à signer')
  }

  const resetSignForm = () => {
    setRecipientEmail(INITIAL_FORM.recipientEmail)
    setInteractionType(INITIAL_FORM.interactionType)
    setContextLabel(INITIAL_FORM.contextLabel)
    setContent(INITIAL_FORM.content)
    setManualHash(INITIAL_FORM.manualHash)
    setNotifyRecipient(INITIAL_FORM.notifyRecipient)
    clearSelectedFile()
    setSignResult(null)
    setError('')
  }

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigning(true)
    setError('')
    setSignResult(null)
    try {
      const contentHash = await resolveContentHash()
      const res = await fetch('/api/bis/sign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          interactionType,
          contextLabel: contextLabel.trim() || undefined,
          contentHash,
          notifyRecipient,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          router.replace(
            `/pricing?feature=bis&message=${encodeURIComponent(data.error ?? 'Plan requis')}`,
          )
          return
        }
        throw new Error(data.error ?? 'Erreur de signature')
      }
      setSignResult({
        signatureId: data.signatureId,
        signature: data.signature,
        bisLevel: data.bisLevel,
        verifyUrl: data.verifyUrl,
        expiresAt: data.expiresAt,
        notificationRequested: Boolean(data.notificationRequested),
        interactionType,
        recipientEmail,
      })
      await loadLists()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de signature')
    } finally {
      setSigning(false)
    }
  }

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-syne text-2xl font-bold text-white">
            <FileSignature className="h-7 w-7 text-bt-cyan" aria-hidden />
            Signatures BIS
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Signez vos interactions (email, document, contrat…) avec votre identité BLOCKTRUST™ certifiée.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTab('sign')
            setSignResult(null)
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-bt-cyan px-4 py-2.5 text-sm font-semibold text-[#0a1628] transition hover:bg-bt-cyan/90"
        >
          <Send className="h-4 w-4" aria-hidden />
          Signer une interaction
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-white/10">
        {(
          [
            ['sent', 'Envoyées'],
            ['received', 'Reçues'],
            ['sign', 'Signer'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[44px] px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? 'border-b-2 border-bt-cyan text-bt-cyan'
                : 'text-white/50 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {tab === 'sign' ? (
        signResult ? (
          <BisSignSuccessPanel result={signResult} onNewSignature={resetSignForm} />
        ) : (
          <form
            onSubmit={handleSign}
            className="space-y-4 rounded-xl border border-white/10 bg-[#0d1f3c] p-6"
          >
            <p className="text-xs text-white/45">
              Le contenu n&apos;est jamais envoyé au serveur — seul le hash SHA-256 est calculé dans votre
              navigateur avant signature.
            </p>
            <div>
              <label htmlFor="recipientEmail" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
                Email du destinataire
              </label>
              <input
                id="recipientEmail"
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5 text-white outline-none focus:border-bt-cyan"
              />
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5">
              <input
                type="checkbox"
                checked={notifyRecipient}
                onChange={(e) => setNotifyRecipient(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 accent-[#00d4ff]"
              />
              <span className="text-sm text-white/80">Notifier le destinataire par email</span>
            </label>
            <div>
              <label htmlFor="interactionType" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
                Type d&apos;interaction
              </label>
              <select
                id="interactionType"
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5 text-white outline-none focus:border-bt-cyan"
              >
                {BIS_INTERACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getBisInteractionLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contextLabel" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
                Contexte (optionnel)
              </label>
              <input
                id="contextLabel"
                type="text"
                maxLength={200}
                value={contextLabel}
                onChange={(e) => setContextLabel(e.target.value)}
                placeholder="Ex. Mandat de vente, Facture Q2…"
                className="w-full rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5 text-white outline-none focus:border-bt-cyan"
              />
            </div>
            <div>
              <label htmlFor="bisDocumentFile" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
                Document (optionnel)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label
                  htmlFor="bisDocumentFile"
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#0a1628] px-4 py-2.5 text-sm text-white/80 transition hover:border-bt-cyan/50 hover:text-white"
                >
                  {hashingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <FileUp className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  {hashingFile ? 'Calcul SHA-256…' : 'Choisir un fichier'}
                </label>
                <input
                  id="bisDocumentFile"
                  type="file"
                  accept={BIS_FILE_ACCEPT_ATTR}
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={hashingFile || signing}
                />
                {selectedFile ? (
                  <div className="flex min-h-[44px] flex-1 items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-emerald-200">
                        {selectedFile.name} · {formatBisFileSize(selectedFile.size)}
                      </p>
                      <p className="font-mono text-[10px] text-white/45">
                        {manualHash.slice(0, 8)}…
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearSelectedFile()
                        setManualHash('')
                      }}
                      className="shrink-0 rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
                      aria-label="Retirer le fichier"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-white/40">
                PDF, PNG, JPG, DOCX, XLSX, TXT — max 10 Mo. Le fichier reste sur votre appareil.
                Seule l&apos;empreinte numérique (SHA-256) est enregistrée.
              </p>
              {fileError ? (
                <p className="mt-1 text-xs text-red-300">{fileError}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="manualHash" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
                Empreinte SHA-256 (optionnel)
              </label>
              <input
                id="manualHash"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={64}
                value={manualHash}
                onChange={(e) => {
                  setManualHash(e.target.value.replace(/[^a-fA-F0-9]/g, ''))
                  if (e.target.value.trim()) {
                    clearSelectedFile()
                  }
                }}
                placeholder="64 caractères hexadécimaux…"
                className="w-full rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-bt-cyan"
              />
              <p className="mt-1 text-xs text-white/35">
                Si vous avez déjà calculé le hash ailleurs, saisissez-le ici sans joindre le fichier.
              </p>
            </div>
            <div>
              <label htmlFor="content" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
                Contenu texte à signer (optionnel)
              </label>
              <textarea
                id="content"
                rows={6}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  if (e.target.value.trim()) {
                    clearSelectedFile()
                    setManualHash('')
                  }
                }}
                disabled={Boolean(manualHash.trim())}
                className="w-full rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-bt-cyan disabled:opacity-50"
                placeholder="Collez ici le texte de l'interaction (email, message…) si vous ne joignez pas de document."
              />
            </div>
            <button
              type="submit"
              disabled={signing || hashingFile}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-bt-cyan px-5 py-2.5 text-sm font-semibold text-[#0a1628] disabled:opacity-50"
            >
              {signing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileSignature className="h-4 w-4" aria-hidden />
              )}
              {signing ? 'Signature en cours…' : 'Signer'}
            </button>
          </form>
        )
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        </div>
      ) : (
        <SignatureList
          items={tab === 'sent' ? sent : received}
          mode={tab === 'sent' ? 'sent' : 'received'}
          onCopy={copyText}
          copied={copied}
        />
      )}
    </div>
  )
}

function SignatureList({
  items,
  mode,
  onCopy,
  copied,
}: {
  items: BisListItem[]
  mode: 'sent' | 'received'
  onCopy: (text: string, key: string) => void
  copied: string | null
}) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-white/40">
        {mode === 'sent'
          ? 'Aucune signature envoyée pour le moment.'
          : 'Aucune signature reçue pour le moment.'}
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-white/10 bg-[#0d1f3c] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-white">
                {getBisInteractionLabel(item.interactionType)}
                {item.contextLabel ? (
                  <span className="text-white/50"> — {item.contextLabel}</span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-white/50">
                {mode === 'sent'
                  ? `Vers ${item.recipientEmail}`
                  : `De ${item.senderEmail}`}
              </p>
              <p className="mt-1 font-mono text-xs text-white/35">
                {item.contentHash.slice(0, 8)}…
              </p>
            </div>
            <div className="text-right text-xs">
              <span
                className={`rounded-full px-2 py-0.5 ${
                  item.verified
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {item.verified ? 'Vérifiée' : 'En attente'}
              </span>
              <p className="mt-2 text-white/40">
                {new Date(item.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={item.verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-bt-cyan hover:underline"
            >
              Vérifier
            </a>
            <button
              type="button"
              onClick={() => onCopy(item.verifyUrl, item.id)}
              className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
            >
              <Copy className="h-3 w-3" aria-hidden />
              {copied === item.id ? 'Copié' : 'Copier le lien'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
