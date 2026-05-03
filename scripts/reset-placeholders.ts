import { prisma } from "@/app/lib/db"

async function main() {
  const updated = await prisma.threatArticle.updateMany({
    where: {
      summaryFr: {
        contains: "Synthèse indisponible",
      },
    },
    data: {
      summaryFr: "",
      processedAt: null,
    },
  })
  console.log(`Reset ${updated.count} articles`)
  await prisma.$disconnect()
}

main().catch(console.error)
