/**
 * Sources RSS — veille cyber (cron).
 * URLs de secours pour sites qui filtrent par chemin.
 */
export const THREAT_RSS_SOURCES = [
  {
    source: "CERT_FR",
    urls: ["https://www.cert.ssi.gouv.fr/feed/"],
  },
  {
    source: "CYBERMALVEILLANCE",
    urls: [
      "https://www.cybermalveillance.gouv.fr/actualites/rss/",
      "https://www.cybermalveillance.gouv.fr/actualites/feed/",
      "https://cybermalveillance.gouv.fr/actualites/rss/",
    ],
  },
  {
    source: "ZATAZ",
    urls: ["https://www.zataz.com/feed/", "https://zataz.com/feed/"],
  },
] as const

export type ThreatArticleSource = (typeof THREAT_RSS_SOURCES)[number]["source"]
