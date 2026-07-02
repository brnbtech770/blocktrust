-- P0 sécurité : invalidation JWT + suppression compte programmée
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "accountDeletionScheduledAt" TIMESTAMP(3);
