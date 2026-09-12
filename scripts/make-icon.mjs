#!/usr/bin/env node
// Generates the Dining Car app icon: a locomotive "served" on a plate, in
// the app's own Carnegie Mellon palette (see src/app/globals.css --primary /
// --background — Cardinal Red on charcoal), then rasterizes background +
// foreground layers (for Android adaptive icons) plus a combined icon and a
// 512x512 Play Store listing icon.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve(import.meta.dirname, "..", "assets");
mkdirSync(OUT, { recursive: true });

const RED = "#df1e39"; // oklch(0.58 0.22 22), the app's --primary (CMU Cardinal Red)
const RED_DARK = "#a3132b";
const CREAM = "#f2f2f2";
const IRON_GREY = "#63666a"; // CMU's official secondary color — needs to be light enough to read against BG_DARK
const BG_DARK = "#0c0d10"; // oklch(0.16 0.006 255), the app's --background
const BG_DARK2 = "#1c1e22";

const SIZE = 1024;
const CX = SIZE / 2;

// --- shared artwork, drawn in a 0..1024 coordinate space ---------------
// The actual lucide "train-front" icon (src/components/dining-car.tsx already
// uses <TrainFront> in the header) — reused here at app-icon scale so the
// launcher icon matches the icon already inside the app. Source path data:
// node_modules/lucide-react/dist/esm/icons/train-front.mjs (24x24 viewBox,
// stroke-based, ISC licensed).
const TRAIN_FRONT_PATHS = [
  "M8 3.1V7a4 4 0 0 0 8 0V3.1",
  "m9 15-1-1",
  "m15 15 1-1",
  "M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z",
  "m8 19-2 3",
  "m16 19 2 3",
];
// Scale the 24x24 icon up to a ~380x380 mark, centered a bit above the
// plate's middle.
const TRAIN_SCALE = 380 / 24;
const TRAIN_TX = 512 - 12 * TRAIN_SCALE;
const TRAIN_TY = 480 - 12 * TRAIN_SCALE;

const trainAndPlate = `
  <!-- plate -->
  <ellipse cx="${CX}" cy="600" rx="330" ry="290" fill="${CREAM}" />
  <ellipse cx="${CX}" cy="600" rx="330" ry="290" fill="none" stroke="${RED_DARK}" stroke-width="10" opacity="0.3" />
  <ellipse cx="${CX}" cy="590" rx="250" ry="215" fill="none" stroke="${RED_DARK}" stroke-width="6" opacity="0.2" />

  <!-- steam -->
  <circle cx="512" cy="250" r="34" fill="${CREAM}" opacity="0.55" />
  <circle cx="566" cy="204" r="24" fill="${CREAM}" opacity="0.4" />
  <circle cx="608" cy="164" r="16" fill="${CREAM}" opacity="0.25" />

  <!-- train-front (same icon used in the app header) — Cardinal Red, the vibrant CMU accent -->
  <g transform="translate(${TRAIN_TX}, ${TRAIN_TY}) scale(${TRAIN_SCALE})"
     fill="none" stroke="${RED}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    ${TRAIN_FRONT_PATHS.map((d) => `<path d="${d}" />`).join("\n    ")}
  </g>

  <!-- fork (left of plate) -->
  <g fill="${IRON_GREY}" opacity="0.9">
    <rect x="150" y="560" width="30" height="240" rx="14" />
    <rect x="126" y="430" width="14" height="140" rx="7" />
    <rect x="150" y="430" width="14" height="140" rx="7" />
    <rect x="174" y="430" width="14" height="140" rx="7" />
    <rect x="120" y="560" width="80" height="30" rx="14" />
  </g>

  <!-- knife (right of plate) -->
  <g fill="${IRON_GREY}" opacity="0.9">
    <rect x="844" y="560" width="30" height="240" rx="14" />
    <path d="M 830 430 Q 859 420 888 430 L 874 560 L 844 560 Z" />
  </g>
`;

async function render(svg, size = SIZE) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function main() {
  // Background layer: warm dark radial vignette, no foreground content
  // (adaptive icons show this behind a masked/scaled foreground).
  const backgroundSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stop-color="${BG_DARK2}" />
          <stop offset="100%" stop-color="${BG_DARK}" />
        </radialGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)" />
    </svg>
  `;

  // Foreground layer: transparent background, artwork kept inside the
  // ~66% adaptive-icon safe zone (roughly x/y 170..854).
  const foregroundSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      ${trainAndPlate}
    </svg>
  `;

  // Combined icon: background + foreground baked together, for legacy
  // launcher icons, notification base art, and the Play Store listing icon.
  const combinedSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stop-color="${BG_DARK2}" />
          <stop offset="100%" stop-color="${BG_DARK}" />
        </radialGradient>
        <clipPath id="round"><rect width="${SIZE}" height="${SIZE}" rx="200" ry="200" /></clipPath>
      </defs>
      <g clip-path="url(#round)">
        <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)" />
        ${trainAndPlate}
      </g>
    </svg>
  `;

  await sharp(await render(backgroundSvg)).toFile(path.join(OUT, "icon-background.png"));
  await sharp(await render(foregroundSvg)).toFile(path.join(OUT, "icon-foreground.png"));
  await sharp(await render(combinedSvg)).toFile(path.join(OUT, "icon.png"));
  await sharp(await render(combinedSvg, 512)).toFile(path.join(OUT, "playstore-icon-512.png"));

  // Splash screen: the app itself always renders in dark mode (see
  // src/app/layout.tsx / globals.css), so give it a matching dark splash
  // instead of Capacitor's default white one, for both light/dark system
  // theme (splash.png / splash-dark.png) so there's no flash either way.
  const SPLASH_SIZE = 2732;
  const splashSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SPLASH_SIZE}" height="${SPLASH_SIZE}" viewBox="0 0 ${SPLASH_SIZE} ${SPLASH_SIZE}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stop-color="${BG_DARK2}" />
          <stop offset="100%" stop-color="${BG_DARK}" />
        </radialGradient>
      </defs>
      <rect width="${SPLASH_SIZE}" height="${SPLASH_SIZE}" fill="url(#bg)" />
      <g transform="translate(${(SPLASH_SIZE - SIZE) / 2}, ${(SPLASH_SIZE - SIZE) / 2})">
        ${trainAndPlate}
      </g>
    </svg>
  `;
  await sharp(await render(splashSvg, SPLASH_SIZE)).toFile(path.join(OUT, "splash.png"));
  await sharp(await render(splashSvg, SPLASH_SIZE)).toFile(path.join(OUT, "splash-dark.png"));

  console.log("Wrote assets/icon.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png, playstore-icon-512.png");
}

main();
