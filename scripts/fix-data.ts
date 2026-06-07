import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'

async function main() {
  console.log("🔧 Correction des données...");

  // Corriger les Entity avec NULL
  const entitiesFixed = await prisma.$executeRaw`
    UPDATE "Entity" 
    SET "legalName" = COALESCE("legalName", 'Entité non renseignée'),
        "siret" = COALESCE("siret", '00000000000000')
    WHERE "legalName" IS NULL OR "siret" IS NULL
  `;
  console.log(`✅ ${entitiesFixed} entités corrigées`);

  // Supprimer les VerificationEvent avec NULL jti (ils ne peuvent pas être corrigés car jti doit référencer Signature)
  const eventsDeleted = await prisma.$executeRaw`
    DELETE FROM "VerificationEvent" 
    WHERE "jti" IS NULL
  `;
  console.log(`✅ ${eventsDeleted} événements de vérification supprimés (jti NULL invalide)`);

  console.log("✨ Correction terminée !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
