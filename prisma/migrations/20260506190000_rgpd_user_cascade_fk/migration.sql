-- RGPD / privacy : renforcer ON DELETE pour effacement compte & intégrité référentielle.
-- Appliquer sur PostgreSQL (noms de contraintes Prisma par défaut).

-- Organization : suppression du propriétaire → suppression de l'organisation
ALTER TABLE "Organization" DROP CONSTRAINT IF EXISTS "Organization_ownerId_fkey";
ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PersonalAccount : idem (compte famille B2C)
ALTER TABLE "PersonalAccount" DROP CONSTRAINT IF EXISTS "PersonalAccount_ownerId_fkey";
ALTER TABLE "PersonalAccount"
  ADD CONSTRAINT "PersonalAccount_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Entity : suppression organisation → entités rattachées
ALTER TABLE "Entity" DROP CONSTRAINT IF EXISTS "Entity_organizationId_fkey";
ALTER TABLE "Entity"
  ADD CONSTRAINT "Entity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AdminAlert : suppression utilisateur → alertes rattachées (plus de SET NULL)
ALTER TABLE "AdminAlert" DROP CONSTRAINT IF EXISTS "AdminAlert_userId_fkey";
ALTER TABLE "AdminAlert"
  ADD CONSTRAINT "AdminAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
