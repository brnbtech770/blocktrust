'use client'

/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * Dashboard — signatures BIS (envoyées / reçues + formulaire)
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Check,
  Copy,
  FileSignature,
  Loader2,
  Send,
} from 'lucide-react'
import { BIS_INTERACTION_TYPES } from '@/lib/bis-access'

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

type SignResult = {
  signatureId: string
  signature: string
  bisLevel: number
  verifyUrl: string
  expiresAt: string
}

const TYPE_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  DOCUMENT: 'Document',
  PAYMENT_REQUEST: 'Demande de paiement',
  CONTRACT: 'Contrat',
  MARKETPLACE: 'Marketplace',
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
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
  const [signResult, setSignResult] = useState<SignResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const [recipientEmail, setRecipientEmail] = useState('')
  const [interactionType, setInteractionType] = useState<string>('EMAIL')
  const [contextLabel, setContextLabel] = useState('')
  const [content, setContent] = useState('')

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

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigning(true)
    setError('')
    setSignResult(null)
    try {
      const contentHash = await sha256Hex(content)
      const res = await fetch('/api/bis/sign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          interactionType,
          contextLabel: contextLabel.trim() || undefined,
          contentHash,
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
      setSignResult(data as SignResult)
      setContent('')
      await loadLists()
      setTab('sent')
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
          onClick={() => setTab('sign')}
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
                  {TYPE_LABELS[t] ?? t}
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
            <label htmlFor="content" className="mb-1 block text-xs uppercase tracking-wider text-white/50">
              Contenu à signer
            </label>
            <textarea
              id="content"
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-bt-cyan"
              placeholder="Collez ici le texte ou le contenu de l'interaction…"
            />
          </div>
          <button
            type="submit"
            disabled={signing}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-bt-cyan px-5 py-2.5 text-sm font-semibold text-[#0a1628] disabled:opacity-50"
          >
            {signing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileSignature className="h-4 w-4" aria-hidden />
            )}
            {signing ? 'Signature en cours…' : 'Signer'}
          </button>

          {signResult ? (
            <div className="mt-4 space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <Check className="h-4 w-4" aria-hidden />
                Interaction signée — niveau BIS {signResult.bisLevel}
              </p>
              <div>
                <p className="text-xs text-white/50">Lien de vérification</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={signResult.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-bt-cyan hover:underline"
                  >
                    {signResult.verifyUrl}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(signResult.verifyUrl, 'url')}
                    className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                  >
                    <Copy className="h-3 w-3" aria-hidden />
                    {copied === 'url' ? 'Copié' : 'Copier'}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/50">Signature JWS (à intégrer dans l&apos;email ou document)</p>
                <textarea
                  readOnly
                  rows={3}
                  value={signResult.signature}
                  className="mt-1 w-full rounded border border-white/10 bg-[#0a1628] p-2 font-mono text-xs text-white/80"
                />
                <button
                  type="button"
                  onClick={() => copyText(signResult.signature, 'jws')}
                  className="mt-2 inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                >
                  <Copy className="h-3 w-3" aria-hidden />
                  {copied === 'jws' ? 'Copié' : 'Copier la signature'}
                </button>
              </div>
            </div>
          ) : null}
        </form>
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
                {TYPE_LABELS[item.interactionType] ?? item.interactionType}
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
                {item.contentHash.slice(0, 16)}…
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
