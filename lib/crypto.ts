/**
 * JWT RS256 sign/verify using BLOCKTRUST_JWT_PRIVATE_KEY and BLOCKTRUST_JWT_PUBLIC_KEY.
 * Production: migrate to AWS KMS before first paying client.
 */
import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
} from "jose";

const ALGO = "RS256";

async function getPrivateKey() {
  const pem = (process.env.BLOCKTRUST_JWT_PRIVATE_KEY ?? "").replace(
    /\\n/g,
    "\n"
  );
  return importPKCS8(pem, ALGO);
}

async function getPublicKey() {
  const pem = (process.env.BLOCKTRUST_JWT_PUBLIC_KEY ?? "").replace(
    /\\n/g,
    "\n"
  );
  return importSPKI(pem, ALGO);
}

export async function signPayload(payload: {
  entityId: string;
  certificateId: string;
  ctxHash: string;
  ctxType: string;
  subject: string;
  recipient?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const pk = await getPrivateKey();
  const exp = payload.expiresInSeconds ?? 31_536_000;
  return new SignJWT({
    entityId: payload.entityId,
    certificateId: payload.certificateId,
    ctxHash: payload.ctxHash,
    ctxType: payload.ctxType,
    subject: payload.subject,
    recipient: payload.recipient,
  })
    .setProtectedHeader({ alg: ALGO })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + exp)
    .setJti(crypto.randomUUID())
    .setIssuer("blocktrust.tech")
    .sign(pk);
}

export async function verifySignature(token: string): Promise<{
  valid: boolean;
  payload?: unknown;
  error?: string;
}> {
  try {
    const pk = await getPublicKey();
    const { payload } = await jwtVerify(token, pk, {
      issuer: "blocktrust.tech",
      algorithms: [ALGO],
    });
    return { valid: true, payload };
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
