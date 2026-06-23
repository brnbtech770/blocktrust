// lib/mcp/server.ts
// Serveur MCP BlockTrust — enregistrement des 15 tools + dispatch lazy.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_TOOL_DEFINITIONS, MCP_TOOL_ZOD } from "@/lib/mcp/tool-definitions";
import type { McpToolContext, McpToolHandler } from "@/lib/mcp/types";

export { MCP_TOOL_DEFINITIONS };

type ToolName = keyof typeof MCP_TOOL_ZOD;

const HANDLER_LOADERS: Record<ToolName, () => Promise<McpToolHandler>> = {
  verify_identity: async () =>
    (await import("@/lib/mcp/tools/verify-identity")).handleVerifyIdentity,
  verify_domain: async () =>
    (await import("@/lib/mcp/tools/verify-domain")).handleVerifyDomain,
  verify_website: async () =>
    (await import("@/lib/mcp/tools/verify-website")).handleVerifyWebsite,
  verify_interaction: async () =>
    (await import("@/lib/mcp/tools/verify-interaction")).handleVerifyInteraction,
  sign_interaction: async () =>
    (await import("@/lib/mcp/tools/sign-interaction")).handleSignInteraction,
  get_trust_score: async () =>
    (await import("@/lib/mcp/tools/get-trust-score")).handleGetTrustScore,
  list_trusted_domains: async () =>
    (await import("@/lib/mcp/tools/list-trusted-domains")).handleListTrustedDomains,
  check_domain_reputation: async () =>
    (await import("@/lib/mcp/tools/check-domain-reputation")).handleCheckDomainReputation,
  add_contact: async () => (await import("@/lib/mcp/tools/add-contact")).handleAddContact,
  search_contacts: async () =>
    (await import("@/lib/mcp/tools/search-contacts")).handleSearchContacts,
  list_contacts: async () => (await import("@/lib/mcp/tools/list-contacts")).handleListContacts,
  add_to_trust_circle: async () =>
    (await import("@/lib/mcp/tools/add-to-trust-circle")).handleAddToTrustCircle,
  list_trust_circle: async () =>
    (await import("@/lib/mcp/tools/list-trust-circle")).handleListTrustCircle,
  store_in_vault: async () => (await import("@/lib/mcp/tools/store-in-vault")).handleStoreInVault,
  search_vault: async () => (await import("@/lib/mcp/tools/search-vault")).handleSearchVault,
};

export async function loadMcpContext(userId: string): Promise<McpToolContext> {
  const [{ prisma }, { resolveEffectivePlan }] = await Promise.all([
    import("@/app/lib/db"),
    import("@/lib/plan-features"),
  ]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      subscription: { select: { plan: true, status: true } },
    },
  });

  return {
    userId,
    userEmail: user?.email ?? null,
    plan: resolveEffectivePlan({
      subscription: user?.subscription,
      email: user?.email,
    }),
  };
}

export function buildBlockTrustMcpServer(userId: string): McpServer {
  const server = new McpServer(
    { name: "blocktrust", version: "1.0.0" },
    { capabilities: { tools: { listChanged: true } } },
  );

  let ctxPromise: Promise<McpToolContext> | null = null;
  const resolveCtx = (): Promise<McpToolContext> => {
    ctxPromise ??= loadMcpContext(userId);
    return ctxPromise;
  };

  const withCtx =
    (toolName: ToolName) =>
    async (args: Record<string, unknown>) => {
      const [ctx, handler] = await Promise.all([
        resolveCtx(),
        HANDLER_LOADERS[toolName](),
      ]);
      return handler(ctx, args);
    };

  const toolNames = Object.keys(MCP_TOOL_ZOD) as ToolName[];

  for (const name of toolNames) {
    const def = MCP_TOOL_DEFINITIONS.find((t) => t.name === name)!;
    server.registerTool(
      name,
      { description: def.description, inputSchema: MCP_TOOL_ZOD[name] },
      withCtx(name),
    );
  }

  return server;
}
