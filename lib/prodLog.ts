/**
 * Logs opérationnels : détail en développement, messages épurés en production
 * (évite emails, IDs utilisateur, IDs Stripe, etc. dans les agrégats de logs).
 */
export function btLog(devMessage: string, prodMessage: string): void {
  console.log(
    "[BlockTrust]",
    process.env.NODE_ENV !== "production" ? devMessage : prodMessage
  );
}

export function btError(devMessage: string, prodMessage: string): void {
  console.error(
    "[BlockTrust]",
    process.env.NODE_ENV !== "production" ? devMessage : prodMessage
  );
}

export function btErrorDevDetails(
  devPayload: unknown,
  prodMessage: string
): void {
  if (process.env.NODE_ENV !== "production") {
    console.error("[BlockTrust]", devPayload);
  } else {
    console.error("[BlockTrust]", prodMessage);
  }
}
