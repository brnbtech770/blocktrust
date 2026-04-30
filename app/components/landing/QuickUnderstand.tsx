export default function QuickUnderstand() {
  return (
    <section className="py-12 border-y border-white/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-8 neon-cyan">
          BLOCKTRUST EN 3 CAS CONCRETS
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Cas 1 — Envoi RIB */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 text-left">
            <p className="text-2xl mb-3" aria-hidden>📄</p>
            <p className="text-white font-semibold text-sm mb-2">
              Vous envoyez un RIB
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Votre destinataire scanne votre badge — il sait en 1 seconde
              que c&apos;est bien vous et que le RIB n&apos;a pas été falsifié.
            </p>
          </div>

          {/* Cas 2 — Email frauduleux (typosquatting) */}
          <div className="bg-white/[0.03] border border-bt-cyan/20 rounded-xl p-5 text-left relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                Arnaque fréquente
              </span>
            </div>
            <p className="text-2xl mb-3" aria-hidden>⚠️</p>
            <p className="text-white font-semibold text-sm mb-2">
              Vous recevez un email de votre &quot;banque&quot;
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              L&apos;adresse semble identique — une lettre change, invisible
              à l&apos;oeil nu.
              <span className="block mt-2 font-mono text-[11px]">
                <span className="text-white/30">contact@mabanque.fr</span>
                <br />
                <span className="text-red-400">
                  contact@maban<strong>q</strong>ue.fr
                </span>
              </span>
              <span className="block mt-2">
                Avec BLOCKTRUST : alerte immédiate — ce contact n&apos;est
                pas certifié.
              </span>
            </p>
          </div>

          {/* Cas 3 — Nouveau fournisseur */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 text-left">
            <p className="text-2xl mb-3" aria-hidden>🤝</p>
            <p className="text-white font-semibold text-sm mb-2">
              Un nouveau fournisseur vous contacte
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Il a un badge BLOCKTRUST — son identité est vérifiée, son
              entreprise est certifiée. Vous pouvez traiter en confiance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
