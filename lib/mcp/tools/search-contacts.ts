// lib/mcp/tools/search-contacts.ts
// Tool search_contacts — recherche dans les entités utilisateur.
// ============================================================

import {
  loadUserEntities,
  loadUserTrustCircleMap,
  mapEntityToContact,
  entityDisplayName,
  entityDomain,
} from "@/lib/mcp/helpers/contacts";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleSearchContacts(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
  if (!query) {
    return mcpJsonResult({ error: "query requis." });
  }

  const certifiedOnly = args.certifiedOnly === true;
  const limit =
    typeof args.limit === "number" && args.limit > 0
      ? Math.min(args.limit, 100)
      : 20;

  const [entities, trustMap] = await Promise.all([
    loadUserEntities(ctx.userId),
    loadUserTrustCircleMap(ctx.userId),
  ]);

  const filtered = entities.filter((e) => {
    const name = entityDisplayName(e).toLowerCase();
    const email = e.email.toLowerCase();
    const domain = entityDomain(e)?.toLowerCase() ?? "";
    const label = (e.tradeName ?? e.description ?? "").toLowerCase();
    const matches =
      name.includes(query) ||
      email.includes(query) ||
      domain.includes(query) ||
      label.includes(query);
    if (!matches) return false;
    if (certifiedOnly) {
      const contact = mapEntityToContact(e, trustMap);
      return contact.certified;
    }
    return true;
  });

  const contacts = filtered.slice(0, limit).map((e) => mapEntityToContact(e, trustMap));

  return mcpJsonResult({
    totalResults: filtered.length,
    contacts,
  });
}
