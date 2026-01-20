import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "blocktrust-v2-secret-change-in-production"
);

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "blocktrust-salt";
  return createHash("sha256").update(ip + salt).digest("hex").substring(0, 16);
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export function generateJti(): string {
  return randomBytes(9).toString("base64url").substring(0, 12);
}

interface SignPayload {
  jti: string;
  certificateId: string;
  entityId: string;
  ctxType: string;
  ctxHash: string;
  nonce: string;
}

export async function signContent(
  payload: SignPayload,
  expiresIn: string = "30d"
): Promise<string> {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer("blocktrust.tech")
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);

  return jwt;
}

export async function verifySignature(token: string): Promise<SignPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "blocktrust.tech",
    });
    return payload as unknown as SignPayload;
  } catch (error) {
    return null;
  }
}

export function generateVerifyUrl(jti: string, ctxHash: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://blocktrust.tech";
  const shortHash = ctxHash.substring(0, 16);
  return `${baseUrl}/v/${jti}?h=${shortHash}`;
}
