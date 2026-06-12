-- Remplace BRONZE/SILVER/GOLD/PLATINUM par les codes plans (juin 2026)

ALTER TABLE "Entity" ALTER COLUMN "validationLevel" DROP DEFAULT;
ALTER TABLE "Certificate" ALTER COLUMN "level" DROP DEFAULT;

ALTER TYPE "ValidationLevel" RENAME TO "ValidationLevel_old";

CREATE TYPE "ValidationLevel" AS ENUM (
  'DISCOVERY',
  'ESSENTIEL',
  'PREMIUM',
  'FAMILLE',
  'STARTER',
  'TEAM',
  'ENTERPRISE'
);

ALTER TABLE "Entity"
  ALTER COLUMN "validationLevel" TYPE "ValidationLevel"
  USING (
    CASE "validationLevel"::text
      WHEN 'BRONZE' THEN 'DISCOVERY'
      WHEN 'SILVER' THEN 'PREMIUM'
      WHEN 'GOLD' THEN 'ENTERPRISE'
      WHEN 'PLATINUM' THEN 'ENTERPRISE'
      ELSE 'DISCOVERY'
    END
  )::"ValidationLevel";

ALTER TABLE "Certificate"
  ALTER COLUMN "level" TYPE "ValidationLevel"
  USING (
    CASE "level"::text
      WHEN 'BRONZE' THEN 'DISCOVERY'
      WHEN 'SILVER' THEN 'PREMIUM'
      WHEN 'GOLD' THEN 'ENTERPRISE'
      WHEN 'PLATINUM' THEN 'ENTERPRISE'
      ELSE 'DISCOVERY'
    END
  )::"ValidationLevel";

ALTER TABLE "Entity" ALTER COLUMN "validationLevel" SET DEFAULT 'DISCOVERY';
ALTER TABLE "Certificate" ALTER COLUMN "level" SET DEFAULT 'DISCOVERY';

DROP TYPE "ValidationLevel_old";
