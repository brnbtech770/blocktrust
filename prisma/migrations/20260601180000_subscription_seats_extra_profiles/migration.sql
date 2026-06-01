-- Add-on Famille + sièges B2B : quantité achetée persistée sur la Subscription.
-- Colonnes optionnelles (nullable) → migration non bloquante.
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "seats" INTEGER;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "extraProfiles" INTEGER;
