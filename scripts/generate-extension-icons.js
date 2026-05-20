#!/usr/bin/env node
/**
 * Génère les icônes PNG de l’extension Chrome TrustScan.
 * Fond navy #0a1628 + bouclier BLOCKTRUST (public/favicon.svg).
 *
 * Usage : node scripts/generate-extension-icons.js
 * Dépendance : sharp (devDependency du monorepo — pas dans l’extension).
 */

const { join, dirname } = require("node:path");
const { mkdirSync } = require("node:fs");

const ROOT = join(__dirname, "..");
const SRC_SVG = join(ROOT, "public", "favicon.svg");
const OUT_DIR = join(ROOT, "extension", "icons");

const NAVY = { r: 10, g: 22, b: 40, alpha: 1 };
const SIZES = [16, 48, 128];

async function makeIcon(sharp, size, outPath) {
  const fillRatio = size <= 16 ? 0.92 : 0.88;
  const target = Math.round(size * fillRatio);

  const badgeBuf = await sharp(SRC_SVG, { density: 300 })
    .resize({
      width: target,
      height: target,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const badgeMeta = await sharp(badgeBuf).metadata();
  const left = Math.round((size - (badgeMeta.width ?? target)) / 2);
  const top = Math.round((size - (badgeMeta.height ?? target)) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: NAVY,
    },
  })
    .composite([{ input: badgeBuf, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`[extension-icons] ${outPath} (${size}x${size})`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const sharp = (await import("sharp")).default;

  for (const size of SIZES) {
    await makeIcon(sharp, size, join(OUT_DIR, `icon${size}.png`));
  }

  console.log("[extension-icons] Terminé.");
}

main().catch((err) => {
  console.error("[extension-icons] Erreur:", err);
  process.exit(1);
});
