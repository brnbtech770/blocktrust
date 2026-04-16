'use client'

export default function OnboardingPendingClient({
  kycStatus,
  verificationUrl,
}: {
  kycStatus: string
  verificationUrl: string | null
}) {
  return (
    <div className="mx-auto max-w-[480px] rounded-xl border border-bt-cyan/20 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-gold/30">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
        <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Paiement confirmé</span>
      </div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bt-cyan/20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-bt-cyan border-t-transparent" />
        </div>
        <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Vérification identité</span>
      </div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40">⏳</div>
        <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Activation du compte</span>
      </div>

      <h1 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">
        Vérification en cours
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--bt-muted)' }}>
        Votre dossier est en cours d&apos;analyse (&lt; 24h). Vous recevrez un email dès validation.
      </p>

      {kycStatus === 'REQUIRES_INPUT' && verificationUrl && (
        <div
          className="p-4 rounded-lg mb-6"
          style={{ background: 'rgba(232,148,58,0.15)', border: '1px solid rgba(232,148,58,0.3)' }}
        >
          <p className="text-sm text-amber-200 mb-3">
            Des informations supplémentaires sont requises.
          </p>
          <a
            href={verificationUrl}
            className="inline-block py-2 px-4 rounded-lg font-semibold text-sm"
            style={{ background: '#E8943A', color: '#0a1628' }}
          >
            Reprendre la vérification
          </a>
        </div>
      )}

      {kycStatus === 'REJECTED' && (
        <div
          className="p-4 rounded-lg mb-6"
          style={{ background: 'rgba(224,82,82,0.15)', border: '1px solid rgba(224,82,82,0.3)' }}
        >
          <p className="text-sm text-red-200 mb-3">Votre vérification a été refusée.</p>
          <a
            href="mailto:support@blocktrust.tech"
            className="inline-block py-2 px-4 rounded-lg font-semibold text-sm bg-red-500 text-white"
          >
            Contacter le support
          </a>
        </div>
      )}

      <a
        href="mailto:support@blocktrust.tech"
        className="text-sm"
        style={{ color: 'var(--bt-muted)' }}
      >
        Contacter le support
      </a>
    </div>
  )
}
