'use client'

export default function OnboardingPendingClient({
  kycStatus,
  verificationUrl,
}: {
  kycStatus: string
  verificationUrl: string | null
}) {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        background: 'rgba(13,31,60,0.8)',
        border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 16,
        padding: 32,
      }}
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
        <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Paiement confirmé</span>
      </div>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
        </div>
        <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Vérification identité</span>
      </div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40">⏳</div>
        <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Activation du compte</span>
      </div>

      <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
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
