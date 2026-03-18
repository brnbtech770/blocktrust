import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {

  // 1. Compter les lignes affectées avant (raw SQL pour User si colonne plan existe)
  const userCountResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint as count FROM "User" WHERE plan = 'TRIAL'
  `.catch(() => [{ count: BigInt(0) }])
  const count = Number(userCountResult[0]?.count ?? 0)
  console.log(`Users avec plan TRIAL : ${count}`)

  const countSub = await prisma.subscription.count({
    where: { plan: 'TRIAL' },
  })
  console.log(`Subscriptions avec plan TRIAL : ${countSub}`)

  // 2. Migrer User.plan TRIAL → ESSENTIEL (si colonne plan existe)
  if (count > 0) {
    await prisma.$executeRaw`
      UPDATE "User"
      SET plan = 'ESSENTIEL'
      WHERE plan = 'TRIAL'
    `
    console.log(`✅ ${count} users migrés TRIAL → ESSENTIEL`)
  }

  // 3. Migrer Subscription.plan TRIAL → ESSENTIEL
  if (countSub > 0) {
    await prisma.$executeRaw`
      UPDATE "Subscription"
      SET plan = 'ESSENTIEL'
      WHERE plan = 'TRIAL'
    `
    console.log(`✅ ${countSub} subscriptions migrées`)
  }

  // 4. Vérifier qu'il ne reste plus de TRIAL (User + Subscription)
  const remainingUser = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint as count FROM "User" WHERE plan = 'TRIAL'
  `.catch(() => [{ count: BigInt(0) }])
  const remainingSub = await prisma.subscription.count({
    where: { plan: 'TRIAL' },
  })
  console.log(`Remaining TRIAL (User) : ${remainingUser[0].count}`)
  console.log(`Remaining TRIAL (Subscription) : ${remainingSub}`)

  console.log('Migration terminée ✅')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
