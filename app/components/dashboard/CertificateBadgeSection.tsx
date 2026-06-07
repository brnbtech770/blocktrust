// app/components/dashboard/CertificateBadgeSection.tsx
// Configuration du badge + aperçu (design Lovable)
// ============================================================

'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

import VerifyBadgeButton from '@/app/components/VerifyBadgeButton'

const DIMS = {
  sm: { w: 240, h: 280 },
  md: { w: 320, h: 400 },
  lg: { w: 400, h: 480 },
} as const

type SizeKey = keyof typeof DIMS

export type CertificateBadgeSectionProps = {
  certificateId: string
  publicId: string | null
  baseUrl: string
  signature: {
    jti: string
    contextHash: string | null
    scanCount: number
    maxScans: number
  } | null
}

export default function CertificateBadgeSection({
  certificateId,
  publicId,
  baseUrl,
  signature,
}: CertificateBadgeSectionProps) {
  const [size, setSize] = useState<SizeKey>('md')
  const [scriptOpen, setScriptOpen] = useState(true)
  const [iframeOpen, setIframeOpen] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
  const [iframeCopied, setIframeCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [maxScans, setMaxScans] = useState(signature?.maxScans ?? 10)
  const [settingsSaving, setSettingsSaving] = useState(false)

  const dims = DIMS[size]
  const badgeId = publicId || certificateId
  const widgetCertKey = publicId?.trim() ?? ''
  const scriptCode = widgetCertKey
    ? `<!-- BLOCKTRUST™ Badge Widget -->
<div id="blocktrust-badge"
  data-certificate="${widgetCertKey}"
  data-size="${size}">
</div>
<script src="${baseUrl}/api/widget.js" async defer><\/script>`
    : `<!-- BLOCKTRUST™ : ID de vérification indisponible — le snippet widget sera actif lorsque le publicId sera défini. -->`

  const iframeCode = `<iframe
  src="${baseUrl}/api/badge/${badgeId}?size=${size}"
  width="${dims.w}"
  height="${dims.h}"
  frameborder="0"
  style="border: none; background: transparent;">
</iframe>`

  const copyScript = () => {
    navigator.clipboard.writeText(scriptCode).then(() => {
      setScriptCopied(true)
      setTimeout(() => setScriptCopied(false), 2000)
    })
  }

  const copyIframe = () => {
    navigator.clipboard.writeText(iframeCode).then(() => {
      setIframeCopied(true)
      setTimeout(() => setIframeCopied(false), 2000)
    })
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await fetch(`/api/qr/generate/${certificateId}`, { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error('Erreur')
      window.location.reload()
    } catch {
      alert('Erreur lors de la régénération du QR')
    } finally {
      setRegenerating(false)
    }
  }

  const handleApplyMaxScans = async () => {
    setSettingsSaving(true)
    try {
      const res = await fetch(`/api/qr/settings/${certificateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxScans }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur')
      window.location.reload()
    } catch {
      alert('Erreur lors de la mise à jour')
    } finally {
      setSettingsSaving(false)
    }
  }

  const cardStyle = {
    background: 'rgba(13,31,60,0.8)',
    border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: 12,
    padding: 24,
  }
  const inputStyle = {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(0,212,255,0.15)',
    color: 'rgba(232,234,240,0.6)',
    fontFamily: 'var(--font-mono-bt), "IBM Plex Mono", monospace',
    fontSize: 12,
    borderRadius: 8,
    padding: '10px 14px',
    width: '100%',
  }
  const codeBlockStyle = {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(0,212,255,0.1)',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'var(--font-mono-bt), "IBM Plex Mono", monospace',
    fontSize: 11,
    color: 'rgba(232,234,240,0.7)',
    overflowX: 'auto' as const,
  }
  const copyBtnStyle = {
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid rgba(0,212,255,0.3)',
    color: '#00d4ff',
    borderRadius: 6,
    fontSize: 12,
    padding: '8px 14px',
    marginTop: 8,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Colonne gauche — Configuration */}
      <div className="lg:col-span-5 space-y-6">
        <div style={cardStyle}>
          <h2 className="font-syne mb-4 text-base font-bold tracking-tight text-white">
            Configuration du badge
          </h2>
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">ID du certificat</label>
            <input
              type="text"
              readOnly
              value={certificateId}
              style={inputStyle}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Taille</label>
            <div className="grid w-full grid-cols-3 gap-2">
              {(['sm', 'md', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className="min-w-0 rounded-lg px-2 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors sm:px-3 sm:text-sm"
                  style={{
                    background: size === s ? '#00d4ff' : 'rgba(0,212,255,0.1)',
                    color: size === s ? '#0a1628' : '#00d4ff',
                    border: `1px solid ${size === s ? '#00d4ff' : 'rgba(0,212,255,0.3)'}`,
                  }}
                >
                  {s === 'sm' ? (
                    <>
                      Petit
                      <span className="mt-0.5 block text-[10px] font-normal opacity-80 sm:text-xs">240×280</span>
                    </>
                  ) : s === 'md' ? (
                    <>
                      Moyen
                      <span className="mt-0.5 block text-[10px] font-normal opacity-80 sm:text-xs">320×400</span>
                    </>
                  ) : (
                    <>
                      Grand
                      <span className="mt-0.5 block text-[10px] font-normal opacity-80 sm:text-xs">400×480</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setScriptOpen(!scriptOpen)}
              className="flex items-center gap-2 w-full text-left text-white font-medium mb-2"
            >
              {scriptOpen ? '▼' : '▶'} Code Script (Recommandé)
            </button>
            {scriptOpen && (
              <div style={codeBlockStyle}>
                <pre className="text-xs whitespace-pre-wrap break-all">{scriptCode}</pre>
                <button type="button" onClick={copyScript} style={copyBtnStyle}>
                  {scriptCopied ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-4 w-4" aria-hidden />
                      Copié
                    </span>
                  ) : (
                    'Copier le code'
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4 mt-4">
            <button
              type="button"
              onClick={() => setIframeOpen(!iframeOpen)}
              className="flex items-center gap-2 w-full text-left text-white font-medium mb-2"
            >
              {iframeOpen ? '▼' : '▶'} Code iFrame (Alternative)
            </button>
            {iframeOpen && (
              <div style={codeBlockStyle}>
                <pre className="text-xs whitespace-pre-wrap break-all">{iframeCode}</pre>
                <button type="button" onClick={copyIframe} style={copyBtnStyle}>
                  {iframeCopied ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-4 w-4" aria-hidden />
                      Copié
                    </span>
                  ) : (
                    'Copier le code'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Paramètres QR dynamique */}
        {signature && (
          <div style={cardStyle}>
            <h2 className="font-syne mb-4 text-base font-bold tracking-tight text-white">
              Paramètres du QR dynamique
            </h2>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Nombre max de scans par QR</label>
              <select
                value={maxScans}
                onChange={(e) => setMaxScans(Number(e.target.value))}
                style={{ ...inputStyle, width: 'auto', minWidth: 120 }}
              >
                <option value={1}>1</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={999999}>Illimité</option>
              </select>
              <button
                type="button"
                onClick={handleApplyMaxScans}
                disabled={settingsSaving}
                className="ml-2 px-3 py-2 rounded-lg text-sm bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/30 disabled:opacity-50"
              >
                {settingsSaving ? 'Enregistrement...' : 'Appliquer'}
              </button>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1">Statut actuel</p>
              <p className="text-white text-sm">
                {signature.scanCount} scan(s) effectué(s) sur {signature.maxScans === 999999 ? '∞' : signature.maxScans} maximum
              </p>
              {signature.maxScans !== 999999 && (
                <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00d4ff]"
                    style={{ width: `${Math.min(100, (signature.scanCount / signature.maxScans) * 100)}%` }}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating}
              className="w-full py-2.5 rounded-lg text-sm font-medium border border-[#BDA76B]/50 text-[#BDA76B] hover:bg-[#BDA76B]/10 disabled:opacity-50"
            >
              {regenerating ? 'Génération...' : 'Régénérer le QR'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Le QR est régénéré automatiquement après chaque scan valide. Expiration : 24h si non scanné.
            </p>
          </div>
        )}
      </div>

      {/* Colonne droite — Aperçu */}
      <div className="lg:col-span-7">
        <div style={cardStyle}>
          <h2 className="font-syne mb-4 text-base font-bold tracking-tight text-white">
            Aperçu en direct
          </h2>
          <div className="flex w-full flex-col items-center">
            <div
              className="flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#060d1a] p-6 shadow-[0_0_40px_rgba(0,212,255,0.1)] sm:p-8"
            >
              <img
                src={`/api/badge/${badgeId}?size=${size}`}
                alt="Aperçu du badge BLOCKTRUST"
                width={dims.w}
                height={dims.h}
                className="h-auto max-w-full rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                style={{ maxWidth: dims.w }}
                key={`${size}-${badgeId}`}
              />
            </div>
            <div className="mt-1 w-full max-w-full shrink-0 px-4 sm:px-8">
              <div className="mx-auto w-full" style={{ maxWidth: dims.w }}>
                <VerifyBadgeButton certId={badgeId} behavior="copy" />
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-gray-400">
            Aperçu du badge tel qu’affiché sur votre site. Utilisez le bouton pour copier le lien public de
            vérification (identique au flux sans compte).
          </p>
        </div>
      </div>
    </div>
  )
}
