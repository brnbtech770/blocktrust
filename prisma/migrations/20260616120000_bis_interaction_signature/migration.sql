-- BIS Phase 1 : signatures d'interaction sortantes (additive, non destructive)

CREATE TABLE "InteractionSignature" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderCertId" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientCertId" TEXT,
    "interactionType" TEXT NOT NULL,
    "contextLabel" TEXT,
    "contentHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signaturePayload" TEXT NOT NULL,
    "bisLevel" INTEGER NOT NULL DEFAULT 3,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "polygonTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InteractionSignature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InteractionSignature_senderEmail_idx" ON "InteractionSignature"("senderEmail");
CREATE INDEX "InteractionSignature_recipientEmail_idx" ON "InteractionSignature"("recipientEmail");
CREATE INDEX "InteractionSignature_senderCertId_idx" ON "InteractionSignature"("senderCertId");
CREATE INDEX "InteractionSignature_contentHash_idx" ON "InteractionSignature"("contentHash");
CREATE INDEX "InteractionSignature_senderId_idx" ON "InteractionSignature"("senderId");

ALTER TABLE "InteractionSignature" ADD CONSTRAINT "InteractionSignature_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionSignature" ADD CONSTRAINT "InteractionSignature_senderCertId_fkey" FOREIGN KEY ("senderCertId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
