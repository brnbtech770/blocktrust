import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { prisma } from "@/app/lib/db"
import Navbar from "@/app/components/landing/Navbar"
import Footer from "@/app/components/landing/Footer"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Veille cyber — BlockTrust™",
  description:
    "Actualités courte sécurité numérique (sources CERT-FR, Cybermalveillance, ZATAZ) — résumées pour vous.",
}

function sourceBadgeLabel(source: string): string {
  if (source === "CERT_FR") return "CERT-FR"
  if (source === "CYBERMALVEILLANCE") return "Cybermalveillance.gouv"
  if (source === "ZATAZ") return "ZATAZ"
  return source
}

export default async function MenacesPage() {
  const fetched = await prisma.threatArticle.findMany({
    where: { processedAt: { not: null } },
    orderBy: [{ relevanceScore: "desc" }, { publishedAt: "desc" }],
    take: 100,
  })

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
                  <span className="rounded-md border border-[#BDA76B]/35 bg-[#BDA76B]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#BDA76B]">
                    {sourceBadgeLabel(a.source)}
                  </span>
                  {a.relevanceScore > 0 && (
                    <span className="rounded-md border border-[#00d4ff]/35 bg-[#00d4ff]/10 px-2 py-0.5 font-mono text-[10px] text-[#00d4ff]">
                      Pertinence {a.relevanceScore}/100
                    </span>
                  )}
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
