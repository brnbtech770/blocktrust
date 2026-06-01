-- M2 — Idempotence DB des webhooks Stripe (fail-closed, cas financier critique).
-- Table additive avec clé primaire unique sur l'eventId : un insert en conflit
-- signifie que l'événement a déjà été réclamé/traité.
CREATE TABLE IF NOT EXISTS "ProcessedStripeEvent" (
  "eventId" TEXT NOT NULL,
  "type" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedStripeEvent_pkey" PRIMARY KEY ("eventId")
);
