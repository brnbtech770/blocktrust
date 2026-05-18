import { FileCheck, ShieldAlert, BadgeCheck } from "lucide-react";

export default function QuickUnderstand() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <p className="mb-2 text-xs uppercase tracking-widest text-white/50 neon-cyan">
            BLOCKTRUST EN 3 CAS CONCRETS
          </p>
          <p className="mb-8 text-xs italic text-white/30">
            Exemples parmi des milliers de cas du quotidien
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-3">
          {/* Cas 1 — Envoi RIB */}
          <div className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-bt-cyan/20 bg-bt-cyan/10">
              <FileCheck className="h-5 w-5 text-bt-cyan" aria-hidden />
            </div>
            <p className="mb-2 text-lg font-semibold text-white">Vous envoyez un RIB</p>
            <p className="text-sm leading-relaxed text-white/50">
              Votre destinataire scanne votre badge — il sait en 1 seconde que c&apos;est bien vous et que le
              RIB n&apos;a pas été falsifié.
            </p>
          </div>

          {/* Cas 2 — Email frauduleux (typosquatting) */}
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-bt-cyan/20 bg-white/[0.03] p-5 text-left">
            <div className="absolute right-3 top-3">
              <span className="rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">
                Arnaque fréquente
              </span>
            </div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-[#E05252]/20 bg-[#E05252]/10">
              <ShieldAlert className="h-5 w-5 text-[#E05252]" aria-hidden />
            </div>
            <p className="mb-2 text-lg font-semibold text-white">
              Vous recevez un email de votre &quot;banque&quot;
            </p>
            <p className="text-sm leading-relaxed text-white/50">
              Une lettre change dans l&apos;adresse email — invisible à l&apos;oeil nu.
            </p>
            <div className="mt-3 space-y-1 rounded-lg bg-black/20 p-2 font-mono text-[11px]">
              <p className="text-white/40">contact@mabanque.fr ✓</p>
              <p className="text-red-400">
                contact@maban
                <span className="underline decoration-red-400">q</span>
                ue.fr ✗
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Avec BLOCKTRUST : alerte immédiate — ce contact n&apos;est pas certifié.
            </p>
          </div>

          {/* Cas 3 — Nouveau fournisseur */}
          <div className="flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-gold/20 bg-gold/10">
              <BadgeCheck className="h-5 w-5 text-gold" aria-hidden />
            </div>
            <p className="mb-2 text-lg font-semibold text-white">Un nouveau fournisseur vous contacte</p>
            <p className="text-sm leading-relaxed text-white/50">
              Il a un badge BLOCKTRUST — son identité est vérifiée, son entreprise est certifiée. Vous pouvez
              traiter en confiance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
