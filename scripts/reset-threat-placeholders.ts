import { prisma } from "../app/lib/db"

async function main() {
  const placeholder =
    "(Synthèse indisponible — vérifiez ANTHROPIC_API_KEY ou réessayez demain.)"

  const result = await prisma.threatArticle.updateMany({
    where: { summaryFr: placeholder },
    data: {
      summaryFr: "",
      processedAt: null,
    },
  })

  console.log(`Reset ${result.count} articles`)
  await prisma.$disconnect()
}

main().catch(console.error)
