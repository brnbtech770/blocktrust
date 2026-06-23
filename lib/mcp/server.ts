// lib/mcp/server.ts
// Serveur MCP BlockTrust — enregistrement des 15 tools + dispatch.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/app/lib/db";
import { resolveEffectivePlan } from "@/lib/plan-features";
import { MCP_TOOL_DEFINITIONS, MCP_TOOL_ZOD } from "@/lib/mcp/tool-definitions";
import type { McpToolContext, McpToolHandler } from "@/lib/mcp/types";
import { handleVerifyIdentity } from "@/lib/mcp/tools/verify-identity";
import { handleVerifyDomain } from "@/lib/mcp/tools/verify-domain";
import { handleVerifyWebsite } from "@/lib/mcp/tools/verify-website";
import { handleVerifyInteraction } from "@/lib/mcp/tools/verify-interaction";
import { handleSignInteraction } from "@/lib/mcp/tools/sign-interaction";
import { handleGetTrustScore } from "@/lib/mcp/tools/get-trust-score";
import { handleListTrustedDomains } from "@/lib/mcp/tools/list-trusted-domains";
import { handleCheckDomainReputation } from "@/lib/mcp/tools/check-domain-reputation";
import { handleAddContact } from "@/lib/mcp/tools/add-contact";
import { handleSearchContacts } from "@/lib/mcp/tools/search-contacts";
import { handleListContacts } from "@/lib/mcp/tools/list-contacts";
import { handleAddToTrustCircle } from "@/lib/mcp/tools/add-to-trust-circle";
import { handleListTrustCircle } from "@/lib/mcp/tools/list-trust-circle";
import { handleStoreInVault } from "@/lib/mcp/tools/store-in-vault";
import { handleSearchVault } from "@/lib/mcp/tools/search-vault";

export { MCP_TOOL_DEFINITIONS };

export async function loadMcpContext(userId: string): Promise<McpToolContext> {
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

  const withCtx = (handler: McpToolHandler) => async (args: Record<string, unknown>) => {
    const ctx = await resolveCtx();
    return handler(ctx, args);
  };

  const def = (name: keyof typeof MCP_TOOL_ZOD) =>
    MCP_TOOL_DEFINITIONS.find((t) => t.name === name)!;

  server.registerTool(
    "verify_identity",
    { description: def("verify_identity").description, inputSchema: MCP_TOOL_ZOD.verify_identity },
    withCtx(handleVerifyIdentity),
  );
  server.registerTool(
    "verify_domain",
    { description: def("verify_domain").description, inputSchema: MCP_TOOL_ZOD.verify_domain },
    withCtx(handleVerifyDomain),
  );
  server.registerTool(
    "verify_website",
    { description: def("verify_website").description, inputSchema: MCP_TOOL_ZOD.verify_website },
    withCtx(handleVerifyWebsite),
  );
  server.registerTool(
    "verify_interaction",
    { description: def("verify_interaction").description, inputSchema: MCP_TOOL_ZOD.verify_interaction },
    withCtx(handleVerifyInteraction),
  );
  server.registerTool(
    "sign_interaction",
    { description: def("sign_interaction").description, inputSchema: MCP_TOOL_ZOD.sign_interaction },
    withCtx(handleSignInteraction),
  );
  server.registerTool(
    "get_trust_score",
    { description: def("get_trust_score").description, inputSchema: MCP_TOOL_ZOD.get_trust_score },
    withCtx(handleGetTrustScore),
  );
  server.registerTool(
    "list_trusted_domains",
    {
      description: def("list_trusted_domains").description,
      inputSchema: MCP_TOOL_ZOD.list_trusted_domains,
    },
    withCtx(handleListTrustedDomains),
  );
  server.registerTool(
    "check_domain_reputation",
    {
      description: def("check_domain_reputation").description,
      inputSchema: MCP_TOOL_ZOD.check_domain_reputation,
    },
    withCtx(handleCheckDomainReputation),
  );
  server.registerTool(
    "add_contact",
    { description: def("add_contact").description, inputSchema: MCP_TOOL_ZOD.add_contact },
    withCtx(handleAddContact),
  );
  server.registerTool(
    "search_contacts",
    { description: def("search_contacts").description, inputSchema: MCP_TOOL_ZOD.search_contacts },
    withCtx(handleSearchContacts),
  );
  server.registerTool(
    "list_contacts",
    { description: def("list_contacts").description, inputSchema: MCP_TOOL_ZOD.list_contacts },
    withCtx(handleListContacts),
  );
  server.registerTool(
    "add_to_trust_circle",
    {
      description: def("add_to_trust_circle").description,
      inputSchema: MCP_TOOL_ZOD.add_to_trust_circle,
    },
    withCtx(handleAddToTrustCircle),
  );
  server.registerTool(
    "list_trust_circle",
    { description: def("list_trust_circle").description, inputSchema: MCP_TOOL_ZOD.list_trust_circle },
    withCtx(handleListTrustCircle),
  );
  server.registerTool(
    "store_in_vault",
    { description: def("store_in_vault").description, inputSchema: MCP_TOOL_ZOD.store_in_vault },
    withCtx(handleStoreInVault),
  );
  server.registerTool(
    "search_vault",
    { description: def("search_vault").description, inputSchema: MCP_TOOL_ZOD.search_vault },
    withCtx(handleSearchVault),
  );

  return server;
}
