-- AlterTable: coordonnées certifiées utilisateur (complète Entity.*)
ALTER TABLE "User" ADD COLUMN "certifiedEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "certifiedPhones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "certifiedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
