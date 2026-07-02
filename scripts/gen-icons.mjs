// Generates PWA/app icons from a spectral-waveform glyph that matches the
// GlaciaNav Notes brand mark. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const INK = "#0d1016";
const INK2 = "#151a24";
const ACCENT = "#0ea5e9";
const VIOLET = "#8b5cf6";
const ROSE = "#fb7da8";

// Build an SVG of the waveform glyph. `pad` is the fraction of the canvas kept
// clear around the content (used for Android maskable safe zone).
function svg({ size = 512, pad = 0.14, radius = 0.22, bg = true } = {}) {
  const bars = [0.32, 0.55, 0.82, 1.0, 0.68, 0.46, 0.36];
  const inner = size * (1 - pad * 2);
  const originX = size * pad;
  const cy = size / 2;

  const gap = inner / (bars.length * 2.2);
  const barW = (inner - gap * (bars.length - 1)) / bars.length;
  const maxH = inner * 0.72;

  const rects = bars
    .map((h, i) => {
      const bh = maxH * h;
      const x = originX + i * (barW + gap);
      const y = cy - bh / 2;
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(
        2
      )}" height="${bh.toFixed(2)}" rx="${(barW / 2).toFixed(2)}" fill="url(#bar)"/>`;
    })
    .join("");

  const r = size * radius;
  const bgLayer = bg
    ? `<rect width="${size}" height="${size}" rx="${r}" fill="url(#bgg)"/>
       <circle cx="${size * 0.72}" cy="${size * 0.26}" r="${size * 0.4}" fill="url(#glow)"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INK2}"/>
      <stop offset="1" stop-color="${INK}"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${ACCENT}"/>
      <stop offset="0.6" stop-color="${VIOLET}"/>
      <stop offset="1" stop-color="${ROSE}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${bgLayer}
  ${rects}
</svg>`;
}

async function png(name, opts) {
  const buf = Buffer.from(svg(opts));
  await sharp(buf).png().toFile(join(outDir, name));
  console.log("✓", name);
}

await png("icon-192.png", { size: 192, pad: 0.16, radius: 0.24 });
await png("icon-512.png", { size: 512, pad: 0.16, radius: 0.24 });
// Maskable: generous safe padding, full-bleed background (radius handled by OS).
await png("icon-maskable-512.png", { size: 512, pad: 0.26, radius: 0.5 });
// Apple touch icon: opaque, modest rounding (iOS masks it anyway).
await png("apple-touch-icon.png", { size: 180, pad: 0.16, radius: 0.22 });
await png("favicon-32.png", { size: 32, pad: 0.1, radius: 0.24 });

console.log("Done.");
