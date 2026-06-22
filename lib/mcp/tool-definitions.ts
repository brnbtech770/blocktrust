// lib/mcp/tool-definitions.ts
// Définitions des 15 outils MCP (schemas + descriptions).
// ============================================================

import { z } from "zod";
import type { McpToolDefinition } from "@/lib/mcp/types";

export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "verify_identity",
    description:
      "Vérifie si une adresse email est certifiée BLOCKTRUST. Retourne identité, TrustScore, signaux et ancrage blockchain.",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string", description: "Adresse email à vérifier" } },
      required: ["email"],
    },
  },
  {
    name: "verify_domain",
    description:
      "Vérifie si un domaine est associé à des entités certifiées BLOCKTRUST (âge, TrustScore, typosquatting).",
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string", description: "Nom de domaine" } },
      required: ["domain"],
    },
  },
  {
    name: "verify_website",
    description:
      "Vérifie si un site web appartient à une entité certifiée. Détecte phishing et typosquatting.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "URL ou domaine du site" } },
      required: ["url"],
    },
  },
  {
    name: "verify_interaction",
    description: "Vérifie une signature BIS (BlockTrust Interaction Signature) par son ID.",
    inputSchema: {
      type: "object",
      properties: { bisId: { type: "string", description: "ID de la signature BIS" } },
      required: ["bisId"],
    },
  },
  {
    name: "sign_interaction",
    description:
      "Signe une interaction BIS au nom de l'utilisateur (plan payant + certificat ancré requis).",
    inputSchema: {
      type: "object",
      properties: {
        recipientEmail: { type: "string" },
        interactionType: { type: "string" },
        contextLabel: { type: "string" },
        contentHash: { type: "string", description: "SHA-256 hex (64 car.)" },
      },
      required: ["recipientEmail", "interactionType", "contentHash"],
    },
  },
  {
    name: "get_trust_score",
    description: "Calcule le TrustScore V2 pour un email (sous-scores + activité BIS).",
    inputSchema: {
      type: "object",
      properties: { email: { type: "string" } },
      required: ["email"],
    },
  },
  {
    name: "list_trusted_domains",
    description: "Liste les domaines de confiance du Trust Circle de l'utilisateur.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "check_domain_reputation",
    description: "Analyse la réputation d'un domaine (RDAP, SPF/DMARC, disposable, typosquatting).",
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string" } },
      required: ["domain"],
    },
  },
  {
    name: "add_contact",
    description: "Ajoute un contact au réseau BLOCKTRUST de l'utilisateur.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        name: { type: "string" },
        label: { type: "string" },
        phone: { type: "string" },
        domain: { type: "string" },
        website: { type: "string" },
        notes: { type: "string" },
      },
      required: ["email", "name"],
    },
  },
  {
    name: "search_contacts",
    description: "Recherche dans les contacts par nom, email, domaine ou label.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        certifiedOnly: { type: "boolean" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_contacts",
    description: "Liste tous les contacts avec statut certification et Trust Circle.",
    inputSchema: {
      type: "object",
      properties: {
        certifiedOnly: { type: "boolean" },
        sortBy: { type: "string", enum: ["name", "trustScore", "lastInteraction", "certifiedSince"] },
        limit: { type: "number" },
        offset: { type: "number" },
      },
    },
  },
  {
    name: "add_to_trust_circle",
    description: "Ajoute un contact au Trust Circle (Premium+ requis).",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        relationship: { type: "string", enum: ["MUTUAL", "UNILATERAL", "MANUAL"] },
      },
      required: ["email"],
    },
  },
  {
    name: "list_trust_circle",
    description: "Liste les membres du Trust Circle.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
  },
  {
    name: "store_in_vault",
    description: "Stocke une donnée de confiance dans le Vault (Premium+ ou B2B).",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string" },
        type: { type: "string", enum: ["CONTACT", "DOMAIN", "EMAIL", "PHONE", "URL", "WALLET"] },
        value: { type: "string" },
        associatedEmail: { type: "string" },
        notes: { type: "string" },
        expiresAt: { type: "string" },
      },
      required: ["label", "type", "value"],
    },
  },
  {
    name: "search_vault",
    description:
      "Recherche dans le Vault. compareValue active la détection de fraude RIB (faux RIB).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        type: { type: "string" },
        associatedEmail: { type: "string" },
        compareValue: { type: "string", description: "RIB/IBAN reçu à comparer" },
      },
    },
  },
];

/** Schémas Zod pour registerTool (SDK MCP). */
export const MCP_TOOL_ZOD = {
  verify_identity: { email: z.string() },
  verify_domain: { domain: z.string() },
  verify_website: { url: z.string() },
  verify_interaction: { bisId: z.string() },
  sign_interaction: {
    recipientEmail: z.string(),
    interactionType: z.string(),
    contextLabel: z.string().optional(),
    contentHash: z.string(),
  },
  get_trust_score: { email: z.string() },
  list_trusted_domains: { limit: z.number().optional() },
  check_domain_reputation: { domain: z.string() },
  add_contact: {
    email: z.string(),
    name: z.string(),
    label: z.string().optional(),
    phone: z.string().optional(),
    domain: z.string().optional(),
    website: z.string().optional(),
    notes: z.string().optional(),
  },
  search_contacts: {
    query: z.string(),
    certifiedOnly: z.boolean().optional(),
    limit: z.number().optional(),
  },
  list_contacts: {
    certifiedOnly: z.boolean().optional(),
    sortBy: z.enum(["name", "trustScore", "lastInteraction", "certifiedSince"]).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  },
  add_to_trust_circle: {
    email: z.string(),
    relationship: z.enum(["MUTUAL", "UNILATERAL", "MANUAL"]).optional(),
  },
  list_trust_circle: { limit: z.number().optional() },
  store_in_vault: {
    label: z.string(),
    type: z.string(),
    value: z.string(),
    associatedEmail: z.string().optional(),
    notes: z.string().optional(),
    expiresAt: z.string().optional(),
  },
  search_vault: {
    query: z.string().optional(),
    type: z.string().optional(),
    associatedEmail: z.string().optional(),
    compareValue: z.string().optional(),
  },
} as const;
