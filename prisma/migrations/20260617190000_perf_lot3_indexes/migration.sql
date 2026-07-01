-- Index performance LOT 3 — BIS count + ancrage Polygon + recherche extension

-- Composite BIS : countBisFromSender(recipientEmail, senderEmail)
CREATE INDEX IF NOT EXISTS "InteractionSignature_recipientEmail_senderEmail_idx"
  ON "InteractionSignature"("recipientEmail", "senderEmail");

-- Composite certificats : retryFailedAnchors / retryStalePendingAnchors
CREATE INDEX IF NOT EXISTS "Certificate_status_blockchainStatus_issuedAt_idx"
  ON "Certificate"("status", "blockchainStatus", "issuedAt");

-- GIN arrays Entity — recherche extension verify-sender { has: email/domain }
CREATE INDEX IF NOT EXISTS "idx_entity_certified_emails"
  ON "Entity" USING GIN ("certifiedEmails");

CREATE INDEX IF NOT EXISTS "idx_entity_certified_domains"
  ON "Entity" USING GIN ("certifiedDomains");
