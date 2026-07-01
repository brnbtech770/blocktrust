'use client'

import { useCallback, useRef, useState } from 'react'
import { CheckCircle2, FileUp, Loader2, XCircle } from 'lucide-react'
import {
  BIS_FILE_ACCEPT_ATTR,
  BIS_MAX_FILE_BYTES,
  formatBisFileSize,
  isAcceptedBisFile,
  sha256File,
} from '@/lib/bis-content-hash'

type IntegrityStatus = 'idle' | 'hashing' | 'match' | 'mismatch' | 'error'

type BisDocumentIntegrityCheckProps = {
  expectedHash: string
  signedAtIso: string
}

export function BisDocumentIntegrityCheck({
  expectedHash,
  signedAtIso,
}: BisDocumentIntegrityCheckProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [status, setStatus] = useState<IntegrityStatus>('idle')
  const [fileName, setFileName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const signedAtLabel = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(signedAtIso))

  const processFile = useCallback(
    async (file: File) => {
      setErrorMessage('')
      setFileName('')
      setStatus('hashing')

      if (!isAcceptedBisFile(file)) {
        setStatus('error')
        setErrorMessage('Format non accepté. Utilisez PDF, PNG, JPG, DOCX, XLSX ou TXT.')
        return
      }
      if (file.size > BIS_MAX_FILE_BYTES) {
        setStatus('error')
        setErrorMessage('Fichier trop volumineux (max 10 Mo).')
        return
      }

      try {
        const hash = (await sha256File(file)).toLowerCase()
        setFileName(`${file.name} (${formatBisFileSize(file.size)})`)
        setStatus(hash === expectedHash.toLowerCase() ? 'match' : 'mismatch')
      } catch {
        setStatus('error')
        setErrorMessage('Impossible de calculer l\'empreinte du fichier.')
      }
    },
    [expectedHash],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void processFile(file)
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1f3c] p-5">
      <h2 className="mb-1 font-syne text-sm font-semibold uppercase tracking-widest text-white/70">
        Vérifiez l&apos;intégrité du document
      </h2>
      <p className="mb-4 text-xs text-white/45">
        Le fichier reste sur votre appareil — comparaison SHA-256 locale uniquement.
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver
            ? 'border-bt-cyan bg-bt-cyan/10'
            : 'border-white/20 bg-[#0a1628] hover:border-bt-cyan/50'
        }`}
      >
        {status === 'hashing' ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-bt-cyan" aria-hidden />
            <p className="text-sm text-white/60">Calcul SHA-256 en cours…</p>
          </>
        ) : (
          <>
            <FileUp className="h-8 w-8 text-bt-cyan/80" aria-hidden />
            <p className="text-sm text-white/80">
              Glissez un fichier ici ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-white/40">PDF, PNG, JPG, DOCX, XLSX, TXT — max 10 Mo</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={BIS_FILE_ACCEPT_ATTR}
        className="sr-only"
        onChange={onFileInput}
      />

      {fileName ? (
        <p className="mt-3 text-xs text-white/50">{fileName}</p>
      ) : null}

      {status === 'match' ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
          <p>
            Document intègre — ce fichier correspond exactement à celui qui a été signé le{' '}
            {signedAtLabel}.
          </p>
        </div>
      ) : null}

      {status === 'mismatch' ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden />
          <p>
            Document modifié — ce fichier ne correspond PAS à la signature originale. Le
            document a été altéré.
          </p>
        </div>
      ) : null}

      {status === 'error' && errorMessage ? (
        <p className="mt-3 text-sm text-red-300">{errorMessage}</p>
      ) : null}
    </div>
  )
}
