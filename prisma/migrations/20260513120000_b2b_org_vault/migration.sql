-- BlockTrust B2B — Organisation + BlockTrust Vault

-- OrgRole.MANAGER
DO $migrate$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'OrgRole' AND e.enumlabel = 'MANAGER'
  ) THEN
    ALTER TYPE "OrgRole" ADD VALUE 'MANAGER';
  END IF;
END
$migrate$;

-- Organization.slug + tier
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;
UPDATE "Organization" SET "slug" = "id" WHERE "slug" IS NULL;
ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

ALTER TABLE "Organization" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'STARTER';

-- Vault enums
CREATE TYPE "VaultRole" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER');
CREATE TYPE "VaultEntryType" AS ENUM ('CONTACT', 'DOMAIN', 'EMAIL', 'PHONE', 'URL', 'WALLET');

CREATE TABLE "TrustVault" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustVault_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrustVaultEntry" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VaultEntryType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrustVaultEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrustVaultPermission" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "VaultRole" NOT NULL DEFAULT 'MEMBER',
    CONSTRAINT "TrustVaultPermission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrustVault_organizationId_idx" ON "TrustVault"("organizationId");
CREATE INDEX "TrustVaultEntry_vaultId_idx" ON "TrustVaultEntry"("vaultId");
CREATE INDEX "TrustVaultPermission_vaultId_idx" ON "TrustVaultPermission"("vaultId");
CREATE INDEX "TrustVaultPermission_userId_idx" ON "TrustVaultPermission"("userId");

ALTER TABLE "TrustVault" ADD CONSTRAINT "TrustVault_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustVaultEntry" ADD CONSTRAINT "TrustVaultEntry_vaultId_fkey"
  FOREIGN KEY ("vaultId") REFERENCES "TrustVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustVaultEntry" ADD CONSTRAINT "TrustVaultEntry_addedById_fkey"
  FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrustVaultPermission" ADD CONSTRAINT "TrustVaultPermission_vaultId_fkey"
  FOREIGN KEY ("vaultId") REFERENCES "TrustVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrustVaultPermission" ADD CONSTRAINT "TrustVaultPermission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
