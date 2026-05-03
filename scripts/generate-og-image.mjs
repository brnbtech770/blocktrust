// Génère l'OG image statique 1200x630 BlockTrust.
// Lecture : badge hexagonal source -> compose sur canvas navy + texte SVG.
// Sortie  : app/opengraph-image.png (Next.js convention App Router).
//
// Usage : node scripts/generate-og-image.mjs

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** Même source que les favicons PNG (bouclier + coche — plus de badge Bitcoin raster). */
const SRC_SVG = join(ROOT, "public", "favicon.svg");
const OUT = join(ROOT, "app", "opengraph-image.png");

const W = 1200;
const H = 630;

const NAVY = "#0a1628";
const NAVY_DEEP = "#060e1a";
const NAVY_MID = "#0d1f3c";
const CYAN = "#00d4ff";
const GOLD = "#BDA76B";
const GOLD_LIGHT = "#E8D08A";

// Stack système pour rendu via librsvg/resvg embarqué dans sharp.
const FONT_STACK =
  "Helvetica Neue, Helvetica, Arial, system-ui, -apple-system, sans-serif";

// --- Calculs zones -----------------------------------------------------------
// Badge à droite : carré (favicon SVG 1:1)
const BADGE_H = 440;
const BADGE_W = BADGE_H;
const BADGE_RIGHT_MARGIN = 60;
const BADGE_LEFT = W - BADGE_W - BADGE_RIGHT_MARGIN;
const BADGE_TOP = Math.round((H - BADGE_H) / 2);

// Zone texte : marge gauche 80, jusqu'à 30px avant le badge
const TEXT_X = 80;
const TEXT_MAX_X = BADGE_LEFT - 30;

// --- Texte SVG ---------------------------------------------------------------
const textSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${NAVY_DEEP}"/>
      <stop offset="55%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="${NAVY_MID}"/>
    </linearGradient>
    <radialGradient id="halo" cx="78%" cy="50%" r="42%">
      <stop offset="0%" stop-color="${CYAN}" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="${CYAN}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${CYAN}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${GOLD}"/>
      <stop offset="50%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="100%" stop-color="${GOLD}"/>
    </linearGradient>
  </defs>

  <!-- Fond -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>

  <!-- Grille subtile -->
  <g stroke="${CYAN}" stroke-opacity="0.05" stroke-width="1">
    ${Array.from({ length: 16 })
      .map((_, i) => `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="${H}"/>`) 
      .join("")}
    ${Array.from({ length: 9 })
      .map((_, i) => `<line x1="0" y1="${i * 80}" x2="${W}" y2="${i * 80}"/>`) 
      .join("")}
  </g>

  <!-- Eyebrow gold -->
  <text x="${TEXT_X}" y="180"
        font-family="${FONT_STACK}"
        font-size="18"
        font-weight="600"
        letter-spacing="4"
        fill="url(#goldText)">
    ✦  CERTIFIÉ  ·  ANCRÉ  ·  INFALSIFIABLE
  </text>

  <!-- Titre principal — aligné H1 landing (30/04/2026 Laurianne) -->
  <text x="${TEXT_X}" y="260"
        font-family="${FONT_STACK}"
        font-size="46"
        font-weight="800"
        fill="#ffffff"
        letter-spacing="-0.5">
    L&apos;identité numérique qui
  </text>
  <text x="${TEXT_X}" y="324"
        font-family="${FONT_STACK}"
        font-size="46"
        font-weight="800"
        fill="${CYAN}"
        letter-spacing="-0.5">
    protège vos échanges.
  </text>

  <!-- Trait gold décoratif -->
  <line x1="${TEXT_X}" y1="362" x2="${TEXT_X + 100}" y2="362"
        stroke="url(#goldText)" stroke-width="2" stroke-linecap="round"/>

  <!-- Sous-titre (cohérence metadata) -->
  <text x="${TEXT_X}" y="412"
        font-family="${FONT_STACK}"
        font-size="24"
        font-weight="500"
        fill="#ffffff"
        opacity="0.78">
    Vérifiable par n&apos;importe qui, en 1 scan.
  </text>

  <!-- URL bas-gauche -->
  <text x="${TEXT_X}" y="${H - 50}"
        font-family="${FONT_STACK}"
        font-size="18"
        font-weight="700"
        letter-spacing="3"
        fill="${CYAN}">
    BLOCKTRUST.TECH
  </text>
</svg>
`;

async function main() {
  console.log("[og] Composition de l'OG image 1200x630…");
  console.log(
    `[og] Badge : ${BADGE_W}x${BADGE_H} @ left=${BADGE_LEFT}, top=${BADGE_TOP}`,
  );
  console.log(`[og] Texte : x=${TEXT_X} -> ${TEXT_MAX_X}`);

  const badgeBuf = await sharp(SRC_SVG, { density: 300 })
    .resize({ height: BADGE_H, width: BADGE_W, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9, quality: 92 })
    .toBuffer();

  await sharp(Buffer.from(textSvg))
    .composite([{ input: badgeBuf, left: BADGE_LEFT, top: BADGE_TOP }])
    .png({ compressionLevel: 9, quality: 92 })
    .toFile(OUT);

  const out = await sharp(OUT).metadata();
  const sizeKb = Math.round(readFileSync(OUT).length / 1024);
  console.log(`[og] OK -> ${OUT}`);
  console.log(`[og] Dimensions : ${out.width}x${out.height}`);
  console.log(`[og] Poids      : ${sizeKb} KB`);

  if (out.width !== W || out.height !== H) {
    throw new Error(
      `Dimensions inattendues : ${out.width}x${out.height} (attendu ${W}x${H})`,
    );
  }
}

main().catch((err) => {
  console.error("[og] ECHEC :", err);
  process.exit(1);
});
