/**
 * Génère une paire de clés RSA pour BLOCKTRUST_JWT_PRIVATE_KEY / BLOCKTRUST_JWT_PUBLIC_KEY.
 * Usage: npx tsx scripts/generate-keypair.ts
 *
 * SÉCURITÉ : les clés (surtout la privée) ne sont JAMAIS imprimées en stdout.
 * Elles sont écrites dans un fichier gitignoré (.env.jwt-keypair.local).
 */
import { generateKeyPair, exportPKCS8, exportSPKI } from "jose";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  const { privateKey, publicKey } = await generateKeyPair("RS256", {
    modulusLength: 2048,
  });

  const priv = await exportPKCS8(privateKey);
  const pub = await exportSPKI(publicKey);

  const outPath = join(process.cwd(), ".env.jwt-keypair.local");
  const content =
    `BLOCKTRUST_JWT_PRIVATE_KEY="${priv.replace(/\n/g, "\\n")}"\n` +
    `BLOCKTRUST_JWT_PUBLIC_KEY="${pub.replace(/\n/g, "\\n")}"\n`;

  // Permissions 0600 : lisible uniquement par le propriétaire.
  writeFileSync(outPath, content, { encoding: "utf-8", mode: 0o600 });

  console.log(`✅ Paire de clés JWT écrite dans ${outPath} (gitignored).`);
  console.log("⚠️  Ne committez jamais ce fichier. Copiez les valeurs dans Vercel.");
}

main().catch((err) => {
  console.error("Échec de génération des clés:", err instanceof Error ? err.message : err);
  process.exit(1);
});
