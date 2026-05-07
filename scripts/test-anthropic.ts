/**
 * Smoke test Anthropic pour summarizeThreatForBlockTrust.
 * Charge `.env.local` puis `.env` depuis la racine du repo.
 *
 * Recommandé (aligné deps du projet) :
 *   npx tsx scripts/test-anthropic.ts
 *
 * Avec ts-node + tsconfig Next (`moduleResolution: bundler`),
 * une exécution directe peut échouer ; utiliser tsx ci-dessus.
 */
import { config as loadEnv } from "dotenv"
import { resolve } from "path"
import { summarizeThreatForBlockTrust } from "../lib/threat-articles-anthropic"

loadEnv({ path: resolve(process.cwd(), ".env.local") })
loadEnv({ path: resolve(process.cwd(), ".env") })

async function main() {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.error(
      "ANTHROPIC_API_KEY absente après chargement .env.local / .env — impossible d'appeler l'API.",
    )
    process.exitCode = 1
    return
  }

  const result = await summarizeThreatForBlockTrust({
    title: "Test phishing kit Kratos",
    excerpt:
      "Un nouveau kit de phishing permet de cloner des sites bancaires en quelques minutes sans compétences techniques.",
    articleUrl: "https://test.com",
    source: "TEST",
  })
  console.log("Résultat:", JSON.stringify(result, null, 2))
}

main().catch((err) => {
  console.error("Erreur non gérée:", err)
  process.exitCode = 1
})
