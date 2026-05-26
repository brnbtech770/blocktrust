import { Globe, ShieldCheck, ShieldOff, TrendingUp, type LucideIcon } from "lucide-react";

type Stat = {
  value: string;
  label: string;
  Icon: LucideIcon;
};

const stats: Stat[] = [
  {
    value: "×2",
    label:
      "Le nombre de kits de phishing industrialisés a doublé en 2025",
    Icon: TrendingUp,
  },
  {
    value: "20+",
    label:
      "pays touchés par les campagnes d'usurpation d'identité automatisées",
    Icon: Globe,
  },
  {
    value: "90%",
    label:
      "des compromissions d'identifiants pourraient passer par ces outils d'ici fin 2026",
    Icon: ShieldOff,
  },
];

export default function ThreatAlert() {
  return (
    <section className="relative overflow-hidden py-16">
      <div className="absolute left-1/2 top-0 h-32 w-96 -translate-x-1/2 rounded-full bg-[#E05252]/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl px-4">
        <div className="mb-12 flex flex-col items-center text-center">
          <p className="neon-red mb-2 text-xs font-semibold uppercase tracking-widest">
            Menaces permanentes
          </p>
          <h2 className="font-syne mb-4 max-w-2xl text-2xl font-bold leading-snug text-white sm:text-3xl">
            Aujourd&apos;hui, n&apos;importe qui peut{" "}
            <span className="text-[#E05252]">se faire passer pour vous</span>
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50 sm:text-base">
            Des outils accessibles à tous permettent de cloner une identité, usurper un email ou
            falsifier un document — en quelques minutes, sans compétences techniques.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.Icon;
            return (
              <div
                key={stat.value}
                className="rounded-xl border border-[#E05252]/20 bg-[#E05252]/5 p-6 text-center"
              >
                <div className="mx-auto mb-3 flex justify-center">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E05252]/30 bg-[#E05252]/10">
                    <Icon className="h-5 w-5 text-[#E05252]" aria-hidden strokeWidth={2} />
                  </div>
                </div>
                <p className="font-syne mb-2 text-2xl font-bold text-[#E05252] sm:text-3xl">{stat.value}</p>
                <p className="text-sm leading-relaxed text-white/50">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-8 rounded-2xl border border-[#E05252]/20 bg-[#0d1f3c] p-6">
          <p className="mb-4 text-xs uppercase tracking-widest text-white/70">
            Ce que ces outils permettent à n&apos;importe qui
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              "Cloner l'adresse email de votre banque ou mutuelle",
              "Usurper l'identité d'un fournisseur pour détourner un virement",
              "Créer un faux site quasi-identique au vôtre",
              "Falsifier un document ou un RIB en quelques secondes",
              "Envoyer des QR codes ou documents piégés",
              "Collecter vos données sans laisser de traces",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-xs text-[#E05252]" aria-hidden>
                  →
                </span>
                <p className="text-sm leading-relaxed text-white/60">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#00d4ff]/20 bg-[#00d4ff]/5 p-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#00d4ff]" strokeWidth={2} aria-hidden />
            <p className="text-sm font-semibold uppercase tracking-widest text-[#00d4ff]">
              La réponse BLOCKTRUST
            </p>
          </div>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
            BLOCKTRUST certifie votre identité et celle de vos interlocuteurs — toute tentative
            d&apos;usurpation est détectée immédiatement, avant que le mal soit fait.
          </p>
        </div>
      </div>
    </section>
  );
}