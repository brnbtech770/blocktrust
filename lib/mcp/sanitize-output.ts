// lib/mcp/sanitize-output.ts
// Assainissement récursif des sorties MCP.
// ============================================================

import { sanitizeDisplayText } from "@/lib/sanitize-display-text";

export function sanitizeMcpOutput<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return (sanitizeDisplayText(value) ?? value.replace(/[<>&]/g, "")) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMcpOutput(item)) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeMcpOutput(v);
    }
    return out as T;
  }
  return value;
}

export function mcpJsonResult(data: unknown) {
  const sanitized = sanitizeMcpOutput(data);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(sanitized, null, 2),
      },
    ],
  };
}

export function mcpErrorResult(message: string, extra?: Record<string, unknown>) {
  return mcpJsonResult({ success: false, error: message, ...extra });
}
