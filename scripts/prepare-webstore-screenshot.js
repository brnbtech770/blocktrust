#!/usr/bin/env node
/**
 * Prépare screenshot.png Chrome Web Store (1280×800, PNG 24 bits sans alpha)
 * à partir d’une capture réelle Gmail + TrustScan.
 *
 * Usage : node scripts/prepare-webstore-screenshot.js [chemin-source]
 */

const { join } = require("node:path");
const { existsSync } = require("node:fs");

const ROOT = join(__dirname, "..");
const DEFAULT_SRC = join(
  ROOT,
  "extension",
  "webstore",
  "_source",
  "gmail-trustscan-capture.jpg",
);
const OUT = join(ROOT, "extension", "webstore", "screenshot.png");

const TARGET_W = 1280;
const TARGET_H = 800;

/** Recadrage fenêtre Chrome — ratio 16:10 (= 1280×800). Source ~1024×664. */
const CROP = { left: 98, top: 50, width: 900, height: 563 };

async function main() {
  const src = process.argv[2] ? join(process.cwd(), process.argv[2]) : DEFAULT_SRC;
  if (!existsSync(src)) {
    console.error("[webstore-screenshot] Fichier source introuvable:", src);
    process.exit(1);
  }

  const sharp = (await import("sharp")).default;

  await sharp(src)
    .extract(CROP)
    .resize(TARGET_W, TARGET_H, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .removeAlpha()
    .png({ compressionLevel: 9, force: true })
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  const ok =
    meta.width === TARGET_W &&
    meta.height === TARGET_H &&
    meta.channels === 3 &&
    !meta.hasAlpha;

  console.log(
    `[webstore-screenshot] ${OUT} (${meta.width}x${meta.height}, ${meta.channels} canaux, alpha=${meta.hasAlpha ? "oui" : "non"})`,
  );

  if (!ok) {
    console.error("[webstore-screenshot] Format Web Store non conforme.");
    process.exit(1);
  }

  console.log("[webstore-screenshot] Prêt pour le Chrome Web Store.");
}

main().catch((err) => {
  console.error("[webstore-screenshot] Erreur:", err);
  process.exit(1);
});
