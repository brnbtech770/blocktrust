import { FileCheck, ShieldAlert, BadgeCheck } from "lucide-react";

export default function QuickUnderstand() {
  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2 neon-cyan">
            BLOCKTRUST EN 3 CAS CONCRETS
          </p>
          <p className="text-white/30 text-xs italic mb-8">
            Exemples parmi des milliers de cas du quotidien
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
          {/* Cas 1 — Envoi RIB */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 text-left flex flex-col h-full">
            <div className="w-10 h-10 rounded-lg bg-bt-cyan/10 border border-bt-cyan/20 flex items-center justify-center mb-4">
              <FileCheck className="w-5 h-5 text-bt-cyan" aria-hidden />
            </div>
            <p className="text-white font-semibold text-sm mb-2">
              Vous envoyez un RIB
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Votre destinataire scanne votre badge — il sait en 1 seconde
              que c&apos;est bien vous et que le RIB n&apos;a pas été falsifié.
            </p>
          </div>

          {/* Cas 2 — Email frauduleux (typosquatting) */}
          <div className="bg-white/[0.03] border border-bt-cyan/20 rounded-xl p-5 text-left relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-3 right-3">
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                Arnaque fréquente
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#E05252]/10 border border-[#E05252]/20 flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5 text-[#E05252]" aria-hidden />
            </div>
            <p className="text-white font-semibold text-sm mb-2">
              Vous recevez un email de votre &quot;banque&quot;
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Une lettre change dans l&apos;adresse email — invisible à
              l&apos;oeil nu.
            </p>
            <div className="mt-3 p-2 bg-black/20 rounded-lg font-mono text-[11px] space-y-1">
              <p className="text-white/40">contact@mabanque.fr ✓</p>
              <p className="text-red-400">
                contact@maban
                <span className="underline decoration-red-400">q</span>
                ue.fr ✗
              </p>
            </div>
            <p className="text-white/50 text-xs mt-3 leading-relaxed">
              Avec BLOCKTRUST : alerte immédiate — ce contact n&apos;est
              pas certifié.
            </p>
          </div>

          {/* Cas 3 — Nouveau fournisseur */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 text-left flex flex-col h-full">
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
              <BadgeCheck className="w-5 h-5 text-gold" aria-hidden />
            </div>
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
