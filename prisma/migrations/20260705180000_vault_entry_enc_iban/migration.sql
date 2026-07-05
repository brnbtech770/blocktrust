-- Vault : chiffrement at rest (valueEnc) + type IBAN
ALTER TABLE "TrustVaultEntry" ADD COLUMN IF NOT EXISTS "valueEnc" TEXT;

ALTER TYPE "VaultEntryType" ADD VALUE IF NOT EXISTS 'IBAN';
