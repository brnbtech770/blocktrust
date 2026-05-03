import Parser from "rss-parser"
import { prisma } from "@/app/lib/db"
import { summarizeThreatForBlockTrust } from "@/lib/threat-articles-anthropic"
import { THREAT_RSS_SOURCES } from "@/lib/threat-rss-sources"

const RSS_UA =
  "Mozilla/5.0 (compatible; BlockTrustVeille/1.0; +https://blocktrust.tech/) AppleWebKit/537.36 (KHTML, like Gecko)"

const rssParser = new Parser({
  timeout: 28000,
  headers: {
    "User-Agent": RSS_UA,
    Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
  },
})

/** Nettoie le HTML/CDATA des flux RSS pour l'aperçu + Claude */
function rssTextSnippet(raw?: string): string {
  if (!raw) return ""
  const noTags = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return noTags.slice(0, 4000)
}

function itemPublishedAt(pubDate?: string): Date | null {
  if (!pubDate) return null
  const d = new Date(pubDate)
  return Number.isNaN(d.getTime()) ? null : d
}

const MAX_ITEMS_PER_SOURCE_SCRAPE = 18
/** Nouvelles lignes créées au plus par cron (protection DB / coûts) */
const MAX_NEW_INSERTS_PER_RUN = 42
/** Appels Anthropic au plus par cron */
const MAX_NEW_ANTHROPIC_PER_RUN = 24

async function fetchFeedItems(
  urls: readonly string[],
): Promise<Awaited<ReturnType<Parser["parseURL"]>> | null> {
  for (const url of urls) {
    try {
      const feed = await rssParser.parseURL(url)
      if (feed?.items?.length) return feed
    } catch (e) {
      console.warn("[threat-ingest] RSS échec tentative", url, e)
    }
  }
  return null
}

type QueuedArticle = {
  source: string
  sourceUrl: string
  title: string
  excerpt: string
  publishedAt: Date | null
}

export async function runThreatArticlesIngest(): Promise<{
  scraped: number
  insertedNew: number
  skippedExisting: number
  summarized: number
  skippedNoAnthropicKey: boolean
}> {
  const queued: QueuedArticle[] = []
  const queuedUrls = new Set<string>()

  for (const feedDef of THREAT_RSS_SOURCES) {
    const feed = await fetchFeedItems(feedDef.urls)
    if (!feed) continue

    for (const item of feed.items.slice(0, MAX_ITEMS_PER_SOURCE_SCRAPE)) {
      const linkRaw = item.link ?? (item.guid as string | undefined) ?? ""
      const link = linkRaw.trim()
      if (!link || !/^https?:\/\//i.test(link)) continue
      if (queuedUrls.has(link)) continue
      queuedUrls.add(link)

      const title = rssTextSnippet(item.title) || "(Sans titre)"
      const snippet = rssTextSnippet(
        typeof item.contentSnippet === "string"
          ? item.contentSnippet
          : typeof item.content === "string"
            ? item.content
            : item.description ?? "",
      )
      queued.push({
        source: feedDef.source,
        sourceUrl: link,
        title,
        excerpt: snippet,
        publishedAt: itemPublishedAt(item.pubDate ?? item.isoDate),
      })
    }
  }

  let skippedExisting = 0
  let insertedNew = 0
  let summarized = 0
  let insertBudget = MAX_NEW_INSERTS_PER_RUN
  const skippedNoAnthropicKey = !process.env.ANTHROPIC_API_KEY?.trim()

  for (const item of queued) {
    const existing = await prisma.threatArticle.findUnique({
      where: { sourceUrl: item.sourceUrl },
    })
    if (existing) {
      skippedExisting += 1
      continue
    }

    if (insertBudget <= 0) continue

    await prisma.threatArticle.create({
      data: {
        source: item.source,
        sourceUrl: item.sourceUrl,
        title: item.title.slice(0, 8000),
        excerpt: item.excerpt.slice(0, 8000) || null,
        summaryFr: "",
        relevanceScore: 0,
        publishedAt: item.publishedAt,
        processedAt: null,
      },
    })
    insertedNew += 1
    insertBudget -= 1
  }

  if (skippedNoAnthropicKey || insertedNew === 0) {
    return {
      scraped: queued.length,
      insertedNew,
      skippedExisting,
      summarized: 0,
      skippedNoAnthropicKey,
    }
  }

  const pending = await prisma.threatArticle.findMany({
    where: { processedAt: null },
    orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }],
    take: MAX_NEW_ANTHROPIC_PER_RUN,
  })

  for (const row of pending) {
    const anthro = await summarizeThreatForBlockTrust({
      source: row.source,
      title: row.title,
      excerpt: row.excerpt ?? "",
      articleUrl: row.sourceUrl,
    })

    await prisma.threatArticle.update({
      where: { id: row.id },
      data:
        anthro != null
          ? {
              summaryFr: anthro.summaryFr,
              relevanceScore: anthro.relevanceScore,
              processedAt: new Date(),
            }
          : {
              summaryFr:
                "(Synthèse indisponible — vérifiez ANTHROPIC_API_KEY ou réessayez demain.)",
              relevanceScore: 30,
              processedAt: new Date(),
            },
    })
    summarized += 1
  }

  return {
    scraped: queued.length,
    insertedNew,
    skippedExisting,
    summarized,
    skippedNoAnthropicKey: false,
  }
}
