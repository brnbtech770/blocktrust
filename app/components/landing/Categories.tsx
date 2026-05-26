import {
  ShieldAlert,
  BadgeCheck,
  Fingerprint,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import Reveal from "./Reveal";

type Bullet = {
  ok: boolean;
  text: string;
};

type Category = {
  icon: LucideIcon;
  category: string;
  title: string;
  tagline: string;
  bullets: Bullet[];
  footer: string;
  highlight: boolean;
};

const categories: Category[] = [
  {
    icon: ShieldAlert,
    category: "Sécurité endpoint",
    title: "Antivirus",
    tagline: "Protège votre machine",
    bullets: [
      { ok: true, text: "Bloque les virus et malwares" },
      { ok: true, text: "Filtre les sites dangereux" },
      { ok: false, text: "Ne vérifie aucune identité humaine" },
      { ok: false, text: "Ne sait pas si l'expéditeur est vraiment votre banque" },
    ],
    footer: "Norton, Bitdefender, Avast…",
    highlight: false,
  },
  {
    icon: BadgeCheck,
    category: "Identité régalienne",
    title: "France Identité",
    tagline: "Prouve qui vous êtes à l'État",
    bullets: [
      { ok: true, text: "Vérification d'identité officielle" },
      { ok: true, text: "Démarches administratives en ligne" },
      { ok: false, text: "Inutilisable entre particuliers" },
      { ok: false, text: "Ne certifie ni vos documents ni vos envois" },
    ],
    footer: "Service public · État français",
    highlight: false,
  },
  {
    icon: Fingerprint,
    category: "Identité émettrice",
    title: "BLOCKTRUST",
    tagline: "Prouve qui vous êtes aux autres",
    bullets: [
      { ok: true, text: "Certification cryptographique de votre identité" },
      { ok: true, text: "Tous vos documents signés et infalsifiables" },
      { ok: true, text: "Vérifiable par n'importe qui en 1 scan QR" },
      { ok: true, text: "Ancré sur blockchain Polygon — preuve permanente" },
    ],
    footer: "La 4ᵉ couche que personne d'autre ne couvre",
    highlight: true,
  },
];

export default function Categories() {
  return (
    <section
      id="categories"
      aria-labelledby="categories-heading"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] font-mono neon-gold">
          Pourquoi BLOCKTRUST n&apos;a pas de concurrent
        </p>
        <h2
          id="categories-heading"
          className="font-syne mx-auto max-w-2xl text-2xl font-bold leading-snug text-balance text-white sm:text-3xl"
        >
          Vous êtes déjà protégé contre certaines menaces.{" "}
          <span className="text-bt-cyan">
            Mais pas contre l&apos;usurpation d&apos;identité.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          L&apos;usurpation d&apos;identité ne se traite pas avec un antivirus,
          ni avec une appli d&apos;État, ni avec un code SMS. C&apos;est une
          4ᵉ couche de protection — celle que{" "}
          <span className="font-bold tracking-wider text-bt-cyan">
            BLOCKTRUST
          </span>{" "}
          a créée.
        </p>
      </Reveal>

      <ul
        role="list"
        className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6"
      >
        {categories.map((cat, i) => (
          <CategoryCard key={cat.title} category={cat} delay={150 * i} />
        ))}
      </ul>
    </section>
  );
}

function CategoryCard({
  category,
  delay,
}: {
  category: Category;
  delay: number;
}) {
  const Icon = category.icon;

  if (category.highlight) {
    return (
      <Reveal
        as="li"
        delay={delay}
        className="group relative flex flex-col rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-amber-500/5 p-6 shadow-[0_0_40px_rgba(0,212,255,0.15)] backdrop-blur-sm transition-all motion-safe:hover:-translate-y-[2px] motion-safe:hover:shadow-[0_0_56px_rgba(0,212,255,0.28)] lg:col-span-1"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg"
            style={{
              background: "rgba(0,212,255,0.15)",
              border: "1px solid rgba(0,212,255,0.4)",
            }}
          >
            <Icon
              aria-hidden="true"
              className="h-6 w-6"
              style={{ color: "#00d4ff" }}
            />
          </div>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{
              color: "#E8D08A",
              background: "rgba(189,167,107,0.12)",
              border: "1px solid rgba(189,167,107,0.45)",
            }}
          >
            {category.category}
          </span>
        </div>

        <h3 className="font-syne text-lg font-bold tracking-wider text-bt-cyan sm:text-xl">
          {category.title}
        </h3>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-white/85">
          {category.tagline}
        </p>

        <ul role="list" className="mt-5 space-y-2.5">
          {category.bullets.map((b) => (
            <li
              key={b.text}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85"
            >
              {b.ok ? (
                <Check
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400"
                  strokeWidth={2.5}
                />
              ) : (
                <X
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-white/30"
                  strokeWidth={2.5}
                />
              )}
              <span>{b.text}</span>
            </li>
          ))}
        </ul>

        <p
          className="mt-6 border-t pt-4 font-mono text-xs italic text-gold/80"
          style={{ borderColor: "var(--bt-border-gold)" }}
        >
          {category.footer}
        </p>
      </Reveal>
    );
  }

  return (
    <Reveal
      as="li"
      delay={delay}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/10"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <Icon aria-hidden="true" className="h-6 w-6 text-white/40" />
        </div>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
          {category.category}
        </span>
      </div>

      <h3 className="font-syne text-lg font-semibold text-white/60 sm:text-xl">
        {category.title}
      </h3>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-white/45">
        {category.tagline}
      </p>

      <ul role="list" className="mt-5 space-y-2.5">
        {category.bullets.map((b) => (
          <li
            key={b.text}
            className={`flex items-start gap-2.5 text-sm leading-relaxed ${
              b.ok ? "text-white/55" : "text-white/30"
            }`}
          >
            {b.ok ? (
              <Check
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-white/45"
                strokeWidth={2.5}
              />
            ) : (
              <X
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-white/20"
                strokeWidth={2.5}
              />
            )}
            <span>{b.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-white/5 pt-4 text-xs text-white/35">
        {category.footer}
      </p>
    </Reveal>
  );
}
