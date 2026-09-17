// Champs d'ancrage MCP : public par défaut, détails uniquement pour admin.
// ============================================================

import { isDashboardAdmin } from '@/lib/admin-utils'
import {
  adminAnchorDetails,
  publicAnchorPayload,
  type CertificateAnchorSource,
} from '@/lib/public-anchor'
import type { McpToolContext } from '@/lib/mcp/types'

export function mcpAnchorResponse(
  ctx: McpToolContext,
  cert: CertificateAnchorSource | null | undefined,
): {
  anchored: boolean
  anchoredAt: string | null
  anchorDetails?: ReturnType<typeof adminAnchorDetails>
} {
  const pub = publicAnchorPayload(cert)
  if (!isDashboardAdmin(ctx.userEmail)) return pub
  return { ...pub, anchorDetails: adminAnchorDetails(cert) }
}
