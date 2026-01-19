import { z } from "zod";

// Validation pour /api/v2/issue
export const issueSignatureSchema = z.object({
  entityId: z.string().cuid(),
  contextType: z.enum(["email", "document", "website", "invoice", "contract", "other"]),
  contextData: z.record(z.string(), z.unknown()).optional(),
  expiresInDays: z.number().int().min(1).max(365).default(30),
});

export type IssueSignatureInput = z.infer<typeof issueSignatureSchema>;

// Validation pour /api/v2/verify (query params)
export const verifyQuerySchema = z.object({
  jti: z.string().uuid(),
  h: z.string().min(16).max(64),
});

export type VerifyQueryInput = z.infer<typeof verifyQuerySchema>;
