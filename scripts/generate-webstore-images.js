#!/usr/bin/env node
/**
 * Génère les visuels PNG Chrome Web Store pour TrustScan.
 * Fond navy #0a1628, logo BLOCKTRUST™, badge vert, tagline TrustScan.
 *
 * Usage : node scripts/generate-webstore-images.js
 * Dépendance : sharp (devDependency)
 */

const { join } = require("node:path");
const { mkdirSync } = require("node:fs");

const ROOT = join(__dirname, "..");
const SRC_SVG = join(ROOT, "public", "favicon.svg");
const OUT_DIR = join(ROOT, "extension", "webstore");

const NAVY = "#0a1628";
const CYAN = "#00d4ff";
const GREEN = "#10b981";
const GOLD = "#BDA76B";
const FONT = "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";

/** @param {string} s */
function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {object} p
 * @param {number} p.width
 * @param {number} p.height
 * @param {number} p.shieldSize
 * @param {number} p.shieldX
 * @param {number} p.shieldY
 * @param {number} p.titleSize
 * @param {number} p.titleX
 * @param {number} p.titleY
 * @param {number} p.tagSize
 * @param {number} p.tagY
 * @param {number} p.badgeFontSize
 * @param {number} p.badgeY
 * @param {boolean} [p.wide]
 */
function promoSvg(p) {
  const title = "BLOCKTRUST™";
  const tagline = "TrustScan — Protection identité Gmail";
  const badge = "✓ Certifié BLOCKTRUST™";
  const glow = p.wide
    ? `<ellipse cx="${p.shieldX + p.shieldSize / 2}" cy="${p.shieldY + p.shieldSize / 2}" rx="${p.shieldSize * 0.55}" ry="${p.shieldSize * 0.45}" fill="${CYAN}" opacity="0.08"/>`
    : "";

  const badgeW = p.badgeFontSize * badge.length * 0.52;
  const badgeH = p.badgeFontSize * 2.1;
  const badgeX = p.titleX;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}" height="${p.height}" viewBox="0 0 ${p.width} ${p.height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1f3c"/>
      <stop offset="55%" stop-color="${NAVY}"/>
      <stop offset="100%" stop-color="#060d1a"/>
    </linearGradient>
    <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${CYAN}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${CYAN}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${CYAN}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${p.width}" height="${p.height}" fill="url(#bgGrad)"/>
  <rect x="0" y="${p.height - 3}" width="${p.width}" height="3" fill="url(#accentLine)"/>
  ${glow}
  <rect x="${p.shieldX - 8}" y="${p.shieldY - 8}" width="${p.shieldSize + 16}" height="${p.shieldSize + 16}" rx="18" fill="${CYAN}" opacity="0.06"/>
  <text x="${p.titleX}" y="${p.titleY}" font-family="${FONT}" font-size="${p.titleSize}" font-weight="700" fill="${CYAN}" letter-spacing="1">${esc(title)}</text>
  <text x="${p.titleX}" y="${p.tagY}" font-family="${FONT}" font-size="${p.tagSize}" font-weight="500" fill="#ffffff" opacity="0.88">${esc(tagline)}</text>
  <rect x="${badgeX}" y="${p.badgeY}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${GREEN}" opacity="0.15" stroke="${GREEN}" stroke-opacity="0.55" stroke-width="1.5"/>
  <text x="${badgeX + badgeW / 2}" y="${p.badgeY + badgeH * 0.68}" text-anchor="middle" font-family="${FONT}" font-size="${p.badgeFontSize}" font-weight="600" fill="${GREEN}">${esc(badge)}</text>
  ${p.wide ? `<text x="${p.width - 32}" y="${p.height - 24}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${GOLD}" opacity="0.7">blocktrust.tech</text>` : ""}
</svg>`;
}

function screenshotSvg() {
  const w = 1280;
  const h = 800;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="chromeBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8f9fb"/>
      <stop offset="100%" stop-color="#eef1f5"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${NAVY}"/>
  <rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="12" fill="#dfe3ea"/>
  <rect x="24" y="24" width="${w - 48}" height="36" rx="12" fill="#e8eaed"/>
  <rect x="24" y="48" width="${w - 48}" height="12" fill="#e8eaed"/>
  <circle cx="52" cy="42" r="6" fill="#ff5f57"/>
  <circle cx="72" cy="42" r="6" fill="#febc2e"/>
  <circle cx="92" cy="42" r="6" fill="#28c840"/>
  <rect x="${w / 2 - 180}" y="32" width="360" height="22" rx="11" fill="#ffffff" stroke="#dadce0"/>
  <rect x="24" y="60" width="${w - 48}" height="${h - 84}" fill="url(#chromeBg)"/>
  <rect x="24" y="60" width="${w - 48}" height="56" fill="#ffffff" stroke="#e0e0e0" stroke-width="1"/>
  <text x="48" y="96" font-family="${FONT}" font-size="22" font-weight="500" fill="#5f6368">Gmail</text>
  <rect x="120" y="78" width="420" height="32" rx="8" fill="#f1f3f4"/>
  <text x="136" y="99" font-family="${FONT}" font-size="14" fill="#80868b">Rechercher dans les messages</text>
  <rect x="24" y="116" width="200" height="${h - 140}" fill="#ffffff"/>
  <text x="48" y="156" font-family="${FONT}" font-size="14" font-weight="600" fill="#d93025">Boîte de réception</text>
  <text x="48" y="188" font-family="${FONT}" font-size="13" fill="#5f6368">Messages suivis</text>
  <text x="48" y="216" font-family="${FONT}" font-size="13" fill="#5f6368">Important</text>
  <text x="48" y="244" font-family="${FONT}" font-size="13" fill="#5f6368">Envoyés</text>
  <rect x="224" y="116" width="${w - 272}" height="${h - 140}" fill="#ffffff"/>
  <text x="248" y="156" font-family="${FONT}" font-size="20" font-weight="600" fill="#202124">Contrat de prestation — validation</text>
  <text x="248" y="188" font-family="${FONT}" font-size="14" fill="#5f6368">De : </text>
  <text x="288" y="188" font-family="${FONT}" font-size="14" font-weight="600" fill="#202124">${esc("Marie Dupont <marie@entreprise-certifiee.fr>")}</text>
  <rect x="248" y="208" width="340" height="36" rx="8" fill="${GREEN}" opacity="0.12" stroke="${GREEN}" stroke-opacity="0.45"/>
  <text x="264" y="232" font-family="${FONT}" font-size="15" font-weight="600" fill="${GREEN}">${esc("✓ Certifié BLOCKTRUST™")}</text>
  <rect x="600" y="208" width="180" height="36" rx="8" fill="${CYAN}" opacity="0.12" stroke="${CYAN}" stroke-opacity="0.4"/>
  <text x="616" y="232" font-family="${FONT}" font-size="13" font-weight="600" fill="${CYAN}">TrustScan actif</text>
  <text x="248" y="280" font-family="${FONT}" font-size="14" fill="#3c4043">Bonjour,</text>
  <text x="248" y="308" font-family="${FONT}" font-size="14" fill="#3c4043">Veuillez trouver ci-joint le contrat signé. Identité vérifiée via BLOCKTRUST.</text>
  <text x="248" y="336" font-family="${FONT}" font-size="14" fill="#3c4043">Cordialement,</text>
  <text x="248" y="364" font-family="${FONT}" font-size="14" font-weight="600" fill="#202124">Marie Dupont</text>
  <rect x="${w - 120}" y="72" width="32" height="32" rx="6" fill="${NAVY}" stroke="${CYAN}" stroke-opacity="0.5"/>
  <rect x="24" y="${h - 72}" width="${w - 48}" height="48" fill="${NAVY}"/>
  <text x="48" y="${h - 42}" font-family="${FONT}" font-size="22" font-weight="700" fill="${CYAN}">${esc("BLOCKTRUST™")}</text>
  <text x="280" y="${h - 42}" font-family="${FONT}" font-size="16" fill="#ffffff" opacity="0.85">${esc("TrustScan — Protection identité Gmail")}</text>
  <rect x="${w - 320}" y="${h - 58}" width="280" height="32" rx="16" fill="${GREEN}" opacity="0.15" stroke="${GREEN}" stroke-opacity="0.5"/>
  <text x="${w - 180}" y="${h - 37}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="${GREEN}">${esc("✓ Certifié BLOCKTRUST™")}</text>
</svg>`;
}

/** Visuel carré 128×128 (déclinaison promo-small ou promo-large). */
function square128Svg(variant) {
  const size = 128;
  const isLarge = variant === "large";
  const shieldSize = isLarge ? 62 : 54;
  const shieldY = isLarge ? 10 : 14;
  const shieldX = Math.round((size - shieldSize) / 2);
  const badge = "✓ Certifié";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg128" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1f3c"/>
      <stop offset="100%" stop-color="${NAVY}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg128)" rx="12"/>
  ${isLarge ? `<rect x="0" y="${size - 2}" width="${size}" height="2" fill="${CYAN}" opacity="0.5"/>` : ""}
  <rect x="${shieldX - 4}" y="${shieldY - 4}" width="${shieldSize + 8}" height="${shieldSize + 8}" rx="10" fill="${CYAN}" opacity="0.08"/>
  <text x="${size / 2}" y="84" text-anchor="middle" font-family="${FONT}" font-size="9" font-weight="700" fill="${CYAN}">${esc("BLOCKTRUST™")}</text>
  <text x="${size / 2}" y="96" text-anchor="middle" font-family="${FONT}" font-size="6.5" font-weight="500" fill="#ffffff" opacity="0.85">${esc("TrustScan")}</text>
  <rect x="22" y="102" width="84" height="14" rx="7" fill="${GREEN}" opacity="0.15" stroke="${GREEN}" stroke-opacity="0.5"/>
  <text x="${size / 2}" y="112" text-anchor="middle" font-family="${FONT}" font-size="7" font-weight="600" fill="${GREEN}">${esc(badge)}</text>
</svg>`;
}

/**
 * @param {import('sharp').Sharp} sharp
 * @param {number} size
 */
async function loadShield(sharp, size) {
  return sharp(SRC_SVG, { density: 300 })
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
}

/**
 * @param {import('sharp').Sharp} sharp
 * @param {string} svg
 * @param {{ input: Buffer; left: number; top: number }[]} overlays
 * @param {string} outPath
 * @param {number} width
 * @param {number} height
 */
async function renderSvg(sharp, svg, overlays, outPath, width, height) {
  const base = await sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toBuffer();

  await sharp(base)
    .composite(overlays)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const sharp = (await import("sharp")).default;

  const jobs = [
    {
      file: "promo-small.png",
      width: 440,
      height: 280,
      shieldSize: 96,
      shieldX: 32,
      shieldY: 92,
      titleSize: 28,
      titleX: 148,
      titleY: 118,
      tagSize: 15,
      tagY: 148,
      badgeFontSize: 13,
      badgeY: 168,
      wide: false,
    },
    {
      file: "promo-large.png",
      width: 1400,
      height: 560,
      shieldSize: 220,
      shieldX: 80,
      shieldY: 170,
      titleSize: 56,
      titleX: 360,
      titleY: 240,
      tagSize: 28,
      tagY: 296,
      badgeFontSize: 22,
      badgeY: 330,
      wide: true,
    },
  ];

  for (const job of jobs) {
    const svg = promoSvg(job);
    const shieldBuf = await loadShield(sharp, job.shieldSize);
    const outPath = join(OUT_DIR, job.file);
    await renderSvg(
      sharp,
      svg,
      [{ input: shieldBuf, left: job.shieldX, top: job.shieldY }],
      outPath,
      job.width,
      job.height,
    );
    console.log(`[webstore] ${outPath} (${job.width}x${job.height})`);
  }

  const screenshotPath = join(OUT_DIR, "screenshot.png");
  const toolbarShield = await loadShield(sharp, 24);
  await renderSvg(
    sharp,
    screenshotSvg(),
    [{ input: toolbarShield, left: 1280 - 116, top: 76 }],
    screenshotPath,
    1280,
    800,
  );
  console.log(`[webstore] ${screenshotPath} (1280x800)`);

  const squareJobs = [
    { file: "promo-small-128.png", variant: "small", shieldSize: 54, shieldY: 14 },
    { file: "promo-large-128.png", variant: "large", shieldSize: 62, shieldY: 10 },
  ];

  for (const sq of squareJobs) {
    const svg = square128Svg(sq.variant);
    const shieldBuf = await loadShield(sharp, sq.shieldSize);
    const shieldX = Math.round((128 - sq.shieldSize) / 2);
    const outPath = join(OUT_DIR, sq.file);
    await renderSvg(
      sharp,
      svg,
      [{ input: shieldBuf, left: shieldX, top: sq.shieldY }],
      outPath,
      128,
      128,
    );
    console.log(`[webstore] ${outPath} (128x128)`);
  }

  console.log("[webstore] Terminé.");
}

main().catch((err) => {
  console.error("[webstore] Erreur:", err);
  process.exit(1);
});
