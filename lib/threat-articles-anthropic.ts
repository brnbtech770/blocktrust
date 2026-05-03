/**
 * Anthropic — résumé court + score de pertinence (veille grand public / PME).
 */
function extractJsonObject(text: string): { summary: string; score: number } | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const o = JSON.parse(m[0]) as { summary?: unknown; score?: unknown }
    const summary = typeof o.summary === "string" ? o.summary.trim() : ""
    const scoreRaw = o.score
    const score =
      typeof scoreRaw === "number"
        ? Math.min(100, Math.max(0, Math.round(scoreRaw)))
        : typeof scoreRaw === "string"
          ? Math.min(100, Math.max(0, parseInt(scoreRaw, 10) || 0))
          : 0
    if (!summary) return null
    return { summary, score }
  } catch {
    return null
  }
}

export async function summarizeThreatForBlockTrust(input: {
  source: string
  title: string
  excerpt: string
  articleUrl: string
}): Promise<{ summaryFr: string; relevanceScore: number } | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null

  const model =
    process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-haiku-20241022"

  const userBlock = [
    `Source: ${input.source}`,
    `Titre: ${input.title}`,
    `URL: ${input.articleUrl}`,
    input.excerpt ? `Extrait / description RSS:\n${input.excerpt.slice(0, 4000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const prompt = `Tu es un analyste cyber pour BLOCKTRUST (identité certifiée, anti-phishing pour particuliers et PME en France).

Tâche : à partir du fil d'information ci-dessous, produis STRICTEMENT un JSON UTF-8 valide sans markdown, sans préambule :
{"summary":"<2 phrases en français clair pour un lecteur non expert>","score":<entier 0 à 100>}

Le champ "score" mesure la pertinence pour sensibiliser nos utilisateurs français : phishing, fraude aux virements, usurpation, fuites de données, vulnérabilités à patcher vite, incidents touchant banques/outils grand public → score élevé. Vulgarisation pure technique sans lien direct avec la vigilance utilisateur → score plus bas.

Données :
${userBlock}`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    console.error("[anthropic-threat] HTTP", res.status, errText.slice(0, 500))
    return null
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }
  const text = data.content?.find((b) => b.type === "text")?.text ?? ""
  const parsed = extractJsonObject(text)
  if (!parsed) {
    console.error("[anthropic-threat] JSON parse failed", text.slice(0, 400))
    return null
  }
  return { summaryFr: parsed.summary, relevanceScore: parsed.score }
}
