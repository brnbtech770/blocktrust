-- H7 — Hash at rest : on ne stocke plus les secrets en clair.
-- Migration additive et non bloquante (ADD COLUMN / DROP NOT NULL + scrub).

-- 1) PasswordReset : stocker uniquement le hash SHA-256 du token.
--    `token` devient optionnel (legacy, plus jamais écrit) ; ajout de `tokenHash`.
ALTER TABLE "PasswordReset" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;
ALTER TABLE "PasswordReset" ALTER COLUMN "token" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordReset_tokenHash_idx" ON "PasswordReset"("tokenHash");
-- Les anciens tokens en clair (expirant sous 1h) ne sont plus exploitables : on les purge.
DELETE FROM "PasswordReset" WHERE "tokenHash" IS NULL;

-- 2) WhiteLabelConfig : ne garder que le hash. `apiKey` ne contient plus que l'affichage masqué.
ALTER TABLE "WhiteLabelConfig" ALTER COLUMN "apiKey" DROP DEFAULT;
ALTER TABLE "WhiteLabelConfig" ALTER COLUMN "apiKey" DROP NOT NULL;
DROP INDEX IF EXISTS "WhiteLabelConfig_apiKey_key";
CREATE UNIQUE INDEX IF NOT EXISTS "WhiteLabelConfig_apiKeyHash_key" ON "WhiteLabelConfig"("apiKeyHash");
-- Scrub des clés en clair déjà stockées (la vérification passe désormais par apiKeyHash).
UPDATE "WhiteLabelConfig"
SET "apiKey" = 'bt_live_' || repeat('•', 20) || right("apiKey", 4)
WHERE "apiKey" LIKE 'bt_live_%';
