// lib/mcp/tools/list-contacts.ts
// Tool list_contacts — liste paginée avec stats.
// ============================================================

import {
  loadUserEntities,
  loadUserTrustCircleMap,
  mapEntityToContact,
} from "@/lib/mcp/helpers/contacts";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

type SortBy = "name" | "trustScore" | "lastInteraction" | "certifiedSince";

export async function handleListContacts(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const certifiedOnly = args.certifiedOnly === true;
  const sortBy = (typeof args.sortBy === "string" ? args.sortBy : "name") as SortBy;
  const limit =
    typeof args.limit === "number" && args.limit > 0
      ? Math.min(args.limit, 200)
      : 50;
  const offset =
    typeof args.offset === "number" && args.offset >= 0 ? args.offset : 0;

  const [entities, trustMap] = await Promise.all([
    loadUserEntities(ctx.userId),
    loadUserTrustCircleMap(ctx.userId),
  ]);

  let contacts = entities.map((e) => mapEntityToContact(e, trustMap));
  if (certifiedOnly) contacts = contacts.filter((c) => c.certified);

  contacts.sort((a, b) => {
    switch (sortBy) {
      case "trustScore":
        return (b.trustScore ?? 0) - (a.trustScore ?? 0);
      case "certifiedSince":
      case "lastInteraction":
      case "name":
      default:
        return a.name.localeCompare(b.name, "fr");
    }
  });

  const total = contacts.length;
  const page = contacts.slice(offset, offset + limit);

  const stats = {
    total,
    certified: contacts.filter((c) => c.certified).length,
    inTrustCircle: contacts.filter((c) => c.inTrustCircle).length,
    uncertified: contacts.filter((c) => !c.certified).length,
  };

  return mcpJsonResult({ total, contacts: page, stats });
}
