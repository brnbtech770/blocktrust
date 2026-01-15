import crypto from "crypto";

/**
 * Canonicalize + hash a context payload.
 * V2 principle: the signature binds to the exact context fields.
 */
export function canonicalizeEmailContext(input: {
  from: string;
  to: string;
  subject: string;
  date: string; // ISO
  body?: string;
}) {
  const norm = (s: string) =>
    s
      .trim()
      .replace(/\r\n/g, "\n")
      .replace(/\s+/g, " ");

  const payload = {
    from: norm(input.from).toLowerCase(),
    to: norm(input.to).toLowerCase(),
    subject: norm(input.subject),
    date: new Date(input.date).toISOString(),
    body: input.body ? norm(input.body) : "",
  };

  return JSON.stringify(payload);
}

export function sha256Hex(data: string) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}
