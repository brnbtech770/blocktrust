-- CreateTable
CREATE TABLE "CertificateVerifyToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "certId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "usedByIp" TEXT,

    CONSTRAINT "CertificateVerifyToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateVerifyToken_token_key" ON "CertificateVerifyToken"("token");

-- CreateIndex
CREATE INDEX "CertificateVerifyToken_token_idx" ON "CertificateVerifyToken"("token");

-- CreateIndex
CREATE INDEX "CertificateVerifyToken_certId_idx" ON "CertificateVerifyToken"("certId");

-- AddForeignKey
ALTER TABLE "CertificateVerifyToken" ADD CONSTRAINT "CertificateVerifyToken_certId_fkey" FOREIGN KEY ("certId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
