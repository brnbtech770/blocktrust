/**
 * Anthropic — résumé court + score de pertinence (veille grand public / PME).
 */
function extractJsonObject(text: string): { summary: string; score: number } | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0]) as { summary?: unknown; score?: unknown }

    if (
      typeof parsed.summary === "string" &&
      parsed.summary.trim().length >= 5
    ) {
      let score = 50
      if (typeof parsed.score === "number" && !Number.isNaN(parsed.score)) {
        score = Math.min(100, Math.max(0, Math.round(parsed.score)))
      } else if (typeof parsed.score === "string") {
        const n = parseInt(parsed.score, 10)
        if (!Number.isNaN(n))
          score = Math.min(100, Math.max(0, n))
      }
      return {
        summary: parsed.summary.trim(),
        score,
      }
    }
    return null
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

  /** Modèle par défaut aligné deprecation Haiku 3.5 → Haiku 4.5 */
  const model =
    process.env.ANTHROPIC_MODEL?.trim() ||
    "claude-haiku-4-5-20251001"

  const userBlock = [
    `Source: ${input.source}`,
    `Titre: ${input.title}`,
    `URL: ${input.articleUrl}`,
    input.excerpt ? `Extrait / description RSS:\n${input.excerpt.slice(0, 4000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  const prompt = `Tu es un expert en cybersécurité francophone.
Analyse cet article et réponds UNIQUEMENT avec ce JSON valide, sans markdown, sans backticks, sans explication :
{"summary":"résumé en français en 2-3 phrases simples et accessibles","score":75}

Remplace le champ "summary" par ton résumé réel du contenu ci-dessous, et "score" par un entier entre 0 et 100 (pertinence pour sensibiliser particuliers et PME : phishing, usurpation, correctifs critiques = score élevé).

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
      max_tokens: 768,
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

  /** Plusieurs blocs `text` possibles avec les modèles récents */
  const text =
    data.content
      ?.filter(
        (
          b,
        ): b is { type: "text"; text: string } =>
          b?.type === "text" && typeof b.text === "string",
      )
      .map((b) => b.text.trim())
      .filter(Boolean)
      .join("\n") ?? ""

  const parsed = extractJsonObject(text)
  if (!parsed) {
    console.error("[anthropic-threat] JSON parse failed", text.slice(0, 400))
    return null
  }
  return { summaryFr: parsed.summary, relevanceScore: parsed.score }
}
