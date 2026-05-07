-- AlterTable
ALTER TABLE "Entity" ADD COLUMN "certifiedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Entity" ADD COLUMN "certifiedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Entity" ADD COLUMN "certifiedPhones" TEXT[] DEFAULT ARRAY[]::TEXT[];
