// Génère toutes les icônes BlockTrust à partir du même SVG que favicon (<public/favicon.svg>).
// Ancienne source raster (Bitcoin) abandonnée : une seule source de vérité graphique.
// - public/apple-touch-icon.png  (180x180, fond navy)  -> Safari / iOS Favorites / onglets
// - public/icon-512.png          (512x512, fond navy)  -> PWA / Slack / Discord
// - public/favicon.png           (32x32,  fond navy)   -> tab navigateur fallback
// - public/logo.png              (640x640, transparent) -> composant <Logo>
//
// Usage : node scripts/generate-icons.mjs

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_SVG = join(ROOT, "public", "favicon.svg");

const NAVY = { r: 10, g: 22, b: 40, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Rasterise le badge SVG à la taille cible (haute densité pour qualité).
 */
async function svgToPngBuffer(targetPx) {
  return sharp(SRC_SVG, { density: 300 })
    .resize({
      width: targetPx,
      height: targetPx,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
}

/**
 * Compose le badge sur un canvas carré.
 * - Le badge est resize pour remplir ~88% du canvas (padding ~6% chaque côté).
 * - Pour les petites tailles (<= 64), padding plus serré (96%).
 */
async function makeIcon({ size, background, outPath, fillRatio }) {
  const target = Math.round(size * fillRatio);

  const badgeBuf = await svgToPngBuffer(target);

  const badgeMeta = await sharp(badgeBuf).metadata();
  const left = Math.round((size - (badgeMeta.width ?? target)) / 2);
  const top = Math.round((size - (badgeMeta.height ?? target)) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: badgeBuf, left, top }])
    .png({ compressionLevel: 9, quality: 92 })
    .toFile(outPath);

  const stat = readFileSync(outPath);
  const sizeKb = (stat.length / 1024).toFixed(1);
  console.log(`[icons] ${outPath.split("/").pop()} (${size}x${size}) -> ${sizeKb} KB`);
}

async function main() {
  console.log("[icons] Génération icônes BlockTrust…");

  await makeIcon({
    size: 180,
    background: NAVY,
    outPath: join(ROOT, "public", "apple-touch-icon.png"),
    fillRatio: 0.88,
  });

  await makeIcon({
    size: 512,
    background: NAVY,
    outPath: join(ROOT, "public", "icon-512.png"),
    fillRatio: 0.86,
  });

  await makeIcon({
    size: 32,
    background: NAVY,
    outPath: join(ROOT, "public", "favicon.png"),
    fillRatio: 0.96,
  });

  await makeIcon({
    size: 640,
    background: TRANSPARENT,
    outPath: join(ROOT, "public", "logo.png"),
    fillRatio: 1.0,
  });

  console.log("[icons] OK");
}

main().catch((err) => {
  console.error("[icons] ECHEC :", err);
  process.exit(1);
});
