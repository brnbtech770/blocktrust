import { SignJWT, jwtVerify, importPKCS8, importSPKI } from "jose";

const ALG = "ES256"; // Simple default. You can switch to Ed25519 later.

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}. Please configure it in your .env file.`);
  }
  return v;
}

/**
 * Requires:
 * - BLOCKTRUST_JWT_PRIVATE_KEY (PEM PKCS8)
 * - BLOCKTRUST_JWT_PUBLIC_KEY  (PEM SPKI)
 */
export async function signToken(payload: Record<string, unknown>, expiresInSeconds: number) {
  try {
    const privateKeyPem = requiredEnv("BLOCKTRUST_JWT_PRIVATE_KEY").replace(/\\n/g, "\n");
    const privateKey = await importPKCS8(privateKeyPem, ALG);

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
    const publicKeyPem = requiredEnv("BLOCKTRUST_JWT_PUBLIC_KEY").replace(/\\n/g, "\n");
    const publicKey = await importSPKI(publicKeyPem, ALG);
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
