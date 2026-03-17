/**
 * Génère une paire de clés RSA pour BLOCKTRUST_JWT_PRIVATE_KEY / BLOCKTRUST_JWT_PUBLIC_KEY.
 * Usage: npx tsx scripts/generate-keypair.ts
 * Puis copier les deux lignes dans .env.local et Vercel.
 */
import { generateKeyPair, exportPKCS8, exportSPKI } from "jose";

async function main() {
  const { privateKey, publicKey } = await generateKeyPair("RS256", {
    modulusLength: 2048,
  });

  const priv = await exportPKCS8(privateKey);
  const pub = await exportSPKI(publicKey);

  console.log(
    'BLOCKTRUST_JWT_PRIVATE_KEY="' + priv.replace(/\n/g, "\\n") + '"'
  );
  console.log(
    'BLOCKTRUST_JWT_PUBLIC_KEY="' + pub.replace(/\n/g, "\\n") + '"'
  );
}

main().catch(console.error);
