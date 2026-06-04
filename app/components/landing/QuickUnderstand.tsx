import { Fingerprint, Clock, TrendingUp, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

type Layer = {
  icon: LucideIcon;
  title: string;
  question: string;
  text: string;
};

const layers: Layer[] = [
  {
    icon: Fingerprint,
    title: "Identité vérifiable",
    question: "Qui êtes-vous réellement ?",
    text: "Emails, téléphones, domaines, wallets — certifiés et ancrés cryptographiquement.",
  },
  {
    icon: Clock,
    title: "Contexte vérifiable",
    question: "Dans quelles conditions interagissez-vous ?",
    text: "Horodatage, historique des vérifications, ancrage Polygon (plans payants).",
  },
  {
    icon: TrendingUp,
    title: "Réputation vérifiable",
    question: "Que révèle l'historique des interactions ?",
    text: "TrustScore calculé à partir des relations certifiées, du Trust Circle et du Trust Graph.",
  },
];

export default function QuickUnderstand() {
  return (
    <section id="solution" className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          La solution
        </p>
        <h2 className="font-syne mx-auto max-w-3xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          BLOCKTRUST apporte une <span className="text-bt-cyan">couche de confiance contextuelle</span>{" "}
          à vos interactions numériques.
        </h2>
      </Reveal>

      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 items-stretch gap-5 sm:grid-cols-3 sm:gap-6">
        {layers.map((layer, i) => {
          const Icon = layer.icon;
          return (
            <Reveal
              as="div"
              key={layer.title}
              delay={150 * i}
              className="flex h-full flex-col rounded-xl border border-bt-cyan/20 bg-white/[0.03] p-6 text-left transition-all hover:-translate-y-1 hover:border-bt-cyan/40"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-bt-cyan/30 bg-bt-cyan/10">
                <Icon className="h-5 w-5 text-bt-cyan" aria-hidden />
              </div>
              <h3 className="font-syne text-lg font-semibold text-white">{layer.title}</h3>
              <p className="mt-1.5 text-sm font-medium text-white/80">{layer.question}</p>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{layer.text}</p>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={200} className="mx-auto mt-8 max-w-3xl text-center">
        <p className="text-sm leading-relaxed text-white/55">
          Ces trois couches sont actives dès le premier badge. La réputation s&apos;enrichit avec le
          temps et le réseau — c&apos;est ce qui crée un avantage durable que les concurrents ne
          peuvent pas copier.
        </p>
      </Reveal>

      <Reveal delay={300} className="mx-auto mt-8 max-w-2xl rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center">
        <p className="text-sm leading-relaxed text-white/75 sm:text-base">
          BLOCKTRUST ne dit jamais « cette personne est fiable ».
          <br className="hidden sm:block" />
          <span className="font-semibold text-bt-cyan">
            {" "}BLOCKTRUST vous donne les éléments objectifs pour décider vous-même.
          </span>
        </p>
      </Reveal>
    </section>
  );
}
