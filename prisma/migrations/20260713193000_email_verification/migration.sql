-- Email verification + grandfathering comptes existants
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "User" ADD COLUMN "accountStatus" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "emailVerificationReminderStage" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");

ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grandfathering : comptes créés avant le déploiement = email considéré vérifié
UPDATE "User"
SET "emailVerified" = "createdAt"
WHERE "emailVerified" IS NULL
  AND "createdAt" < TIMESTAMP '2026-07-13 00:00:00';
