-- AlterTable
ALTER TABLE "User" ADD COLUMN "extensionApiKeyHash" TEXT;
ALTER TABLE "User" ADD COLUMN "extensionApiKey" TEXT;

CREATE UNIQUE INDEX "User_extensionApiKeyHash_key" ON "User"("extensionApiKeyHash");
CREATE UNIQUE INDEX "User_extensionApiKey_key" ON "User"("extensionApiKey");
