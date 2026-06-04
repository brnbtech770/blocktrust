-- Consentement CGV + renonciation au droit de rétractation B2C (additif, nullable).
-- Aucune suppression ni altération de colonne/enum existante.
-- AlterTable
ALTER TABLE "User" ADD COLUMN "cgvAcceptedAt" TIMESTAMP(3),
ADD COLUMN "cgvVersion" TEXT,
ADD COLUMN "retractationWaiverAt" TIMESTAMP(3);
