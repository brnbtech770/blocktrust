/**
 * Observabilité du canal d'une clé bt_ext_.
 * Le header X-BT-Client est une déclaration client : il ne doit jamais
 * servir à autoriser, refuser ou choisir un scope.
 */
import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";

export type ApiKeyClientClaim = "extension" | "mcp" | "unknown";

export function observeBtClientHeader(value: string | null | undefined): ApiKeyClientClaim {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "extension" || v === "mcp") return v;
  return "unknown";
}

export function auditApiKeyChannel(params: {
  userId: string;
  keyHash: string;
  /** Endpoint réellement appelé — connu du serveur, pas du header. */
  route: "extension" | "mcp";
  clientHeader: string | null;
}): void {
  writeSecurityAuditLogFireAndForget({
    action: "API_KEY_CHANNEL",
    userId: params.userId,
    resource: "api_key",
    resourceId: params.keyHash,
    metadata: {
      route: params.route,
      clientClaim: observeBtClientHeader(params.clientHeader),
    },
  });
}
