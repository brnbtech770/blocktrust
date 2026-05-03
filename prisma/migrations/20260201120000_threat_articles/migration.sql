-- Veille cyber : articles issus des flux RSS (cron + Anthropic)
CREATE TABLE "ThreatArticle" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "summaryFr" TEXT NOT NULL DEFAULT '',
    "relevanceScore" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ThreatArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThreatArticle_sourceUrl_key" ON "ThreatArticle"("sourceUrl");

CREATE INDEX "ThreatArticle_relevanceScore_publishedAt_idx" ON "ThreatArticle"("relevanceScore" DESC, "publishedAt" DESC);
CREATE INDEX "ThreatArticle_processedAt_idx" ON "ThreatArticle"("processedAt");
