/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
import { SignJWT, jwtVerify } from "jose";
import {
  importEs256PrivateKeyFromEnv,
  importEs256PublicKeyFromEnv,
  normalizeJwtPemFromEnv,
} from "@/lib/jwt-pem";

const ALG = "ES256"; // Simple default. You can switch to Ed25519 later.

/**
 * Requires:
 * - BLOCKTRUST_JWT_PRIVATE_KEY (PEM PKCS8)
 * - BLOCKTRUST_JWT_PUBLIC_KEY  (PEM SPKI)
 */
export async function signToken(payload: Record<string, unknown>, expiresInSeconds: number) {
  try {
    const privateKey = await importEs256PrivateKeyFromEnv(process.env.BLOCKTRUST_JWT_PRIVATE_KEY);

    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: ALG, typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresInSeconds)
      .setIssuer("blocktrust")
      .setAudience("blocktrust.verify")
      .sign(privateKey);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Missing required environment variable")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to sign token: ${message}`);
  }
}

export async function verifyToken(token: string) {
  try {
    const publicKey = await importEs256PublicKeyFromEnv(process.env.BLOCKTRUST_JWT_PUBLIC_KEY);
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: "blocktrust",
      audience: "blocktrust.verify",
    });
    return payload;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Missing required environment variable")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to verify token: ${message}`);
  }
}

/** @internal tests — lecture PEM normalisée sans logger la clé. */
export function normalizeJwtPrivateKeyPemForTests(raw: string | undefined): string {
  return normalizeJwtPemFromEnv(raw);
}
