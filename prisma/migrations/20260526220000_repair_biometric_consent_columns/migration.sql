-- Repair: biometric_consent migration was marked applied but columns missing on prod (P2022 OAuth).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricConsentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricConsentVersion" TEXT;
