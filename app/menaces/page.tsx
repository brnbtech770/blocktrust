import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink, Pin } from "lucide-react"
import { prisma } from "@/app/lib/db"
import Navbar from "@/app/components/landing/Navbar"
import Footer from "@/app/components/landing/Footer"
import { ThreatRelevanceBadge, ThreatSourceBadge } from "@/app/components/menaces/ThreatArticleBadges"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "Veille cyber — BLOCKTRUST™",
  description:
    "Actualités courte sécurité numérique (sources CERT-FR, Cybermalveillance, ZATAZ) — résumées pour vous.",
}

function formatArticleDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const featuredArticles = [
  {
    id: "kratos-phishing-kit",
    title: "Ce kit de phishing fait trembler les experts",
    source: "Journal du Geek",
    sourceUrl:
      "https://www.journaldugeek.com/2026/05/02/ce-kit-de-phishing-fait-trembler-les-experts/",
    summaryFr:
      "Des outils comme Kratos permettent à n'importe qui de lancer des attaques de phishing sophistiquées sans compétences techniques — clonage de sites bancaires, emails frauduleux, QR codes piégés en quelques minutes. Le nombre de ces kits a doublé en 2025, présents dans plus de 20 pays.",
    relevanceScore: 95,
    fetchedAt: new Date("2026-05-02"),
  },
  {
    id: "fnc-rf-fraude-virement",
    title: "La fraude au virement et le FNC-RF — Ce que BLOCKTRUST apporte en complément",
    source: "BFM Business",
    sourceUrl:
      "https://rmc.bfmtv.com/conso/banque-et-assurance/la-fraude-au-virement-devrait-disparaitre-grace-a-cette-nouvelle-plateforme-mise-en-place-des-ce-jeudi_AN-202605050020.html",
    summaryFr:
      "Le Fichier National des Comptes à Risque de Fraude (FNC-RF) est opérationnel depuis le 7 mai 2026. Les banques vérifient en temps réel si un compte est signalé frauduleux. BLOCKTRUST est complémentaire : le FNC-RF est réactif (blacklist de comptes), BLOCKTRUST est proactif (certification de l'identité de l'émetteur avant même le virement).",
    relevanceScore: 98,
    fetchedAt: new Date("2026-05-07"),
  },
  {
    id: "clonage-vocal-appels-silencieux",
    title: "Appels silencieux : l'IA clone votre voix en 3 secondes",
    source: "Bitdefender / Le Parisien",
    sourceUrl:
      "https://www.cnews.fr/vie-numerique/2026-05-04/arnaque-aux-appels-silencieux-attention-cette-nouvelle-escroquerie-qui",
    summaryFr:
      "Un simple 'allô' suffit. En 2026, les cybercriminels utilisent des appels silencieux pour capturer votre empreinte vocale en 3 secondes via l'IA. Votre voix clonée sert ensuite à arnaquer vos proches ou contourner les systèmes bancaires. L'usurpation de numéro a bondi de 517% en 2025.",
    relevanceScore: 97,
    fetchedAt: new Date("2026-05-04"),
  },
] as const

export default async function MenacesPage() {
  let fetched: Awaited<ReturnType<typeof prisma.threatArticle.findMany>> = [];
  try {
    fetched = await prisma.threatArticle.findMany({
      where: { processedAt: { not: null } },
      orderBy: [{ relevanceScore: "desc" }, { publishedAt: "desc" }],
      take: 100,
    });
  } catch (err) {
    console.warn("[menaces] Prisma indisponible, affichage des articles épinglés uniquement");
    console.warn(err);
  }

  const failedPlaceholder =
    "(Synthèse indisponible — vérifiez ANTHROPIC_API_KEY ou réessayez demain.)"

  const good = fetched.filter((a) => a.summaryFr && a.summaryFr !== failedPlaceholder)
  const rows = good.length > 0 ? good : fetched

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--bt-navy)" }}>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
        <header className="mb-12 text-center">
          <p className="neon-cyan mb-2 text-xs font-semibold uppercase tracking-widest">
            Actualités sécurité
          </p>
          <h1 className="font-syne mb-4 text-2xl font-bold text-white sm:text-3xl">
            Veille cyber — priorités pour vous protéger
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/55">
            Extraits automatiques depuis des flux d&apos;autorités et de médias reconnus. Chaque lien ouvre la
            source originale&nbsp;; les synthèses sont produites pour BLOCKTRUST et classées par pertinence
            pour particuliers et PME en France.
          </p>
        </header>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Pin className="h-4 w-4 shrink-0 text-[#BDA76B]" aria-hidden strokeWidth={2} />
            <p className="neon-gold text-xs font-semibold uppercase tracking-widest text-[#BDA76B]">
              À la une
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article) => (
              <Link
                key={article.id}
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-[#BDA76B]/30 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-5 transition-all duration-200 hover:border-[#BDA76B]/60"
                style={{ textDecoration: "none" }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#BDA76B]/30 bg-[#BDA76B]/15 px-2 py-0.5 text-[10px] text-[#BDA76B]">
                    <Pin className="h-3 w-3 shrink-0" aria-hidden strokeWidth={2} />
                    Épinglé
                  </span>
                  <span className="text-xs text-white/30">{article.source}</span>
                  <time dateTime={article.fetchedAt.toISOString()} className="text-[11px] text-white/40">
                    {formatArticleDate(article.fetchedAt)}
                  </time>
                </div>

                <h3 className="font-syne mb-2 text-sm font-semibold text-white transition group-hover:text-[#00d4ff]">
                  {article.title}
                </h3>

                <p className="mb-3 text-xs leading-relaxed text-white/50">{article.summaryFr}</p>

                <div className="inline-flex items-center gap-1 text-xs text-[#00d4ff]/50 transition group-hover:text-[#00d4ff]">
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden strokeWidth={2} />
                  Lire l&apos;article
                </div>
              </Link>
            ))}
          </div>
        </section>

        {rows.length === 0 ? (
          <div
            className="rounded-2xl border border-white/15 bg-white/5 px-6 py-12 text-center backdrop-blur-sm"
            style={{ borderColor: "var(--bt-border)" }}
          >
            <p className="font-syne text-lg text-white/85">Pas encore de contenu récent</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/45">
              Le flux est mis à jour quotidiennement. Revenez vite — ou vérifiez la configuration cron et
              <code className="mx-1 rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs text-[#00d4ff]">
                ANTHROPIC_API_KEY
              </code>
              sur l&apos;hébergement.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-5">
            {rows.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-[#00d4ff]/18 bg-[#0d1f3c]/95 p-5 sm:p-6"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <ThreatSourceBadge source={a.source} />
                  <ThreatRelevanceBadge relevanceScore={a.relevanceScore} />
                  {a.publishedAt && (
                    <time dateTime={a.publishedAt.toISOString()} className="text-[11px] text-white/40">
                      {a.publishedAt.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  )}
                </div>
                <h2 className="font-syne mb-2 text-base font-semibold leading-snug text-white sm:text-lg">
                  {a.title}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-white/70">{a.summaryFr}</p>
                <Link
                  href={a.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#00d4ff] transition hover:text-white"
                  style={{ textDecoration: "none" }}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2} />
                  Lire la source officielle →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
