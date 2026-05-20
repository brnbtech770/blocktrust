-- Index performance — requêtes fréquentes (admin, verify, trust circle, webhooks)

-- CreateIndex
CREATE INDEX "AIAlert_severity_idx" ON "AIAlert"("severity");

-- CreateIndex
CREATE INDEX "AIAlert_createdAt_idx" ON "AIAlert"("createdAt");

-- CreateIndex
CREATE INDEX "Certificate_blockchainStatus_idx" ON "Certificate"("blockchainStatus");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");

-- CreateIndex
CREATE INDEX "TrustVaultEntry_type_idx" ON "TrustVaultEntry"("type");

-- CreateIndex
CREATE INDEX "User_trustScore_idx" ON "User"("trustScore");

-- CreateIndex
CREATE INDEX "UserTrustRelation_status_idx" ON "UserTrustRelation"("status");

-- CreateIndex
CREATE INDEX "Verification_result_idx" ON "Verification"("result");
