import { z } from "zod";
import { VAULT_ENTRY_TYPES } from "@/lib/vault-entry-value";

export const vaultEntryTypeSchema = z.enum(VAULT_ENTRY_TYPES);

export const vaultEntryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: vaultEntryTypeSchema,
  value: z.string().min(1).max(2000),
  description: z.string().max(2000).optional().nullable(),
});

export const vaultCompareBodySchema = z.object({
  compareValue: z.string().min(1).max(2000),
  query: z.string().max(200).optional(),
  entryId: z.string().optional(),
});
