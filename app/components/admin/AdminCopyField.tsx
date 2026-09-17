'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

export default function AdminCopyField({
  value,
  label,
}: {
  value: string
  label: string
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div>
      <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
        {label}
      </p>
      <div className="mt-1 flex flex-wrap items-start gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-white/80">{value}</code>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const ok = await copyToClipboard(value)
              if (!ok) return
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })()
          }}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/80 transition hover:bg-white/5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              Copié
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copier
            </>
          )}
        </button>
      </div>
    </div>
  )
}
