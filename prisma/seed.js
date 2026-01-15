const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now().toString();
  const email = `demo_${suffix}@blocktrust.local`;
  const siret = suffix.padEnd(14, "0").slice(0, 14);

  const user = await prisma.user.create({
    data: {
      email,
      name: "Demo User",
    },
  });

  const entity = await prisma.entity.create({
    data: {
      userId: user.id,
      legalName: "Demo Entity",
      siret,
      email: "contact@demo.test",
      website: "https://demo.test",
      description: "Seed entity",
      kycStatus: "APPROVED",
      validationLevel: "GOLD",
    },
  });

  const certificate = await prisma.certificate.create({
    data: {
      entityId: entity.id,
      status: "APPROVED",
      level: "GOLD",
    },
  });

  console.log(
    JSON.stringify(
      {
        userId: user.id,
        entityId: entity.id,
        certificateId: certificate.id,
        siret: entity.siret,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
