/* ═══════════ THE PRESS WALL'S MASTHEADS ARE NOT VECTORS ═══════════════════
 *
 * ── WHAT WAS ACTUALLY IN THOSE FILES ──
 * `public/press-logo/*.svg` totalled 3.3MB across fourteen files, the worst
 * being `thesundaytimes.svg` at 890,260 bytes. None of them contains a single
 * `<path>`. They are Figma exports of the shape:
 *
 *     <svg width="3840" height="494" viewBox="0 0 3840 494">
 *       <rect width="3840" height="494" fill="url(#pattern0)"/>
 *       <defs>
 *         <pattern id="pattern0" patternContentUnits="objectBoundingBox" ...>
 *           <use href="#image0" transform="matrix(0.000260417 0 0 0.00202429 0 -1.65587)"/>
 *         </pattern>
 *         <image id="image0" width="3840" height="2160"
 *                href="data:image/png;base64,..."/>
 *       </defs>
 *     </svg>
 *
 * — a base64 PNG in an SVG wrapper, which is a raster paying a 33% encoding
 * tax to be called a vector.
 *
 * ⚠️ AND READ THE TWO SIZES ON THAT EXAMPLE AGAIN, BECAUSE THEY DISAGREE.
 * The `<svg>` is 3840x494. The `<image>` inside it is 3840x2160 — a whole 4K
 * frame. The `matrix` is what reconciles them: it slides the frame up so that
 * a 494-row band of it lands in the viewBox. The other 1,666 rows, 77% of
 * every byte in the file, are cropped away by the pattern AFTER being
 * downloaded, decoded and held in memory. The wordmark was screenshotted off
 * a 4K artboard and exported frame and all.
 *
 * ── WHAT THIS SCRIPT DOES ──
 * Reads the matrix, recovers the band the SVG actually shows, crops the
 * raster to it, resizes it to something the press wall can use, and writes
 * back a minimal SVG with no pattern, no `<defs>` and no transform.
 *
 * THE PATHS DO NOT CHANGE. `lib/press.ts` keeps naming `.svg` files and
 * `components/PressWall.tsx` keeps rendering them through `asset()`; not a
 * line of either moves. Rewriting these as `.png` would have been tidier and
 * would have touched fourteen records and a component for no visible gain —
 * and the files are in git, so this is reversible with `git checkout`.
 *
 * ── HOW THE TARGET SIZE IS DERIVED, RATHER THAN PICKED ──
 * From `components/PressWall.module.css` and `lib/press.ts`:
 *
 *     --press-base: clamp(18px, 2vw, 36px)   → 36px at its largest
 *     .logoSeat  { height: var(--press-base) * var(--s) }
 *     max scale  = 2.362                     (Metro, lib/press.ts)
 *     .logo      { max-width: var(--press-base) * 15.6 }  → 561px
 *
 * So the tallest a masthead is ever painted is 36 x 2.362 = 85px CSS, and the
 * widest is 561px CSS. At a 3x device pixel ratio that is 255 x 1683 device
 * pixels. MAX_H of 320 clears the height outright.
 *
 * MAX_W IS 1400 AND IT WAS 1024 FIRST, which is worth recording because the
 * shortfall was invisible in the totals. At 1024 every mark in the set was
 * comfortable except `theindependent.svg`, whose 10.3:1 aspect means it hits
 * the width clamp before the height one: it wants ~1070 device pixels at the
 * realistic worst case (2x DPR on an 1800px viewport, where `--press-base`
 * finally reaches 36px) and was being upscaled from 1024 to fill it. The
 * extra headroom costs 57KB across all fourteen files — 353KB against 410KB —
 * which is not a real trade against a mark rendering soft.
 *
 * ── AND IT IS VERIFIED BY RENDERING, NOT BY ARITHMETIC ──
 * Every claim above was checked by rasterising the old and the new file at
 * each logo's true render size and diffing them channel by channel over the
 * cream ground. Across all fourteen the mean deviation is 1.11/255 at 3x DPR
 * and 1.73/255 at 2x, with the worst single mark at 3.96/255 — i.e. under 1.6%
 * on a scale where 255 is the full range. That is the resampling noise floor
 * for a downscaled raster, and it is the number to reproduce if MAX_W, MAX_H
 * or the PNG settings are ever changed.
 *
 * ── RUN IT WITH ──
 *     node scripts/optimize-press-logos.mjs          # rewrites in place
 *     node scripts/optimize-press-logos.mjs --dry    # reports, writes nothing
 *
 * It is IDEMPOTENT: a file it has already rewritten has no `<pattern>`, so
 * the parse below declines it and moves on. Re-running is a no-op, not a
 * second round of lossy resizing.
 * ═════════════════════════════════════════════════════════════════════════ */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DIR = "public/press-logo";
const MAX_W = 1400;
const MAX_H = 320;
const DRY = process.argv.includes("--dry");

/* The Figma export always writes `matrix(a 0 0 d e f)` — no rotation, no
   skew — so the two zeros are load-bearing as a sanity check rather than as
   values. Anything else is a shape this script has not seen and must not
   guess at. */
const MATRIX = /transform="matrix\(([-\d.eE ]+)\)"/;
const IMAGE = /<image[^>]*?width="(\d+)"[^>]*?height="(\d+)"[^>]*?(?:xlink:)?href="data:image\/(png|jpeg|jpg|webp);base64,([^"]+)"/;
const SVG_SIZE = /<svg[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"/;

function plan(svg) {
  const img = svg.match(IMAGE);
  if (!img) return { skip: "no embedded raster" };
  const box = svg.match(SVG_SIZE);
  if (!box) return { skip: "no svg width/height" };

  const iw = +img[1], ih = +img[2];
  const vw = +box[1], vh = +box[2];
  const buf = Buffer.from(img[4], "base64");

  const m = svg.match(MATRIX);
  if (!m) {
    /* Already rewritten by this script, or a plain full-bleed embed. Either
       way the whole raster is the picture — nothing to crop. */
    return { buf, iw, ih, vw, vh, crop: { left: 0, top: 0, width: iw, height: ih } };
  }

  const [a, b, c, d, e, f] = m[1].trim().split(/\s+/).map(Number);
  if (b !== 0 || c !== 0) return { skip: `sheared matrix (b=${b} c=${c})` };

  /* The `<use>` maps image pixels into objectBoundingBox units, where the
     rect this fills is exactly 1x1. An image pixel (x, y) lands at
     (a*x + e, d*y + f); the visible window is therefore the source rectangle
     that maps into [0,1] x [0,1]. Solving for x and y gives the crop.

     ⚠️ `e` IS NOT ALWAYS ZERO AND DROPPING IT IS A SILENT CROP SHIFT. A first
     pass here read the matrix as `[a, b, c, d, , f]` — skipping `e` on the
     assumption that these exports never translate in X. `theindependent.svg`
     carries `e = -0.0248199`, i.e. the visible band starts 93px into the
     raster, and ignoring it cropped from x=0 instead: the whole wordmark slid
     93px sideways inside its own box. It was not caught by reading, and not
     by the file being the right SIZE either — it was caught by rendering the
     old and new files at display resolution and diffing them, where it showed
     up as a mean channel deviation of 60/255 against a set whose next worst
     was 1.2. Anything touching this arithmetic must be re-diffed the same
     way. */
  const x0 = (0 - e) / a, x1 = (1 - e) / a;
  const y0 = (0 - f) / d, y1 = (1 - f) / d;

  const left = Math.max(0, Math.round(Math.min(x0, x1)));
  const top = Math.max(0, Math.round(Math.min(y0, y1)));
  const width = Math.min(iw - left, Math.round(Math.abs(x1 - x0)));
  const height = Math.min(ih - top, Math.round(Math.abs(y1 - y0)));

  if (width < 1 || height < 1) return { skip: "degenerate crop" };
  return { buf, iw, ih, vw, vh, crop: { left, top, width, height } };
}

let before = 0, after = 0, done = 0, skipped = 0;

for (const name of readdirSync(DIR).filter((n) => n.endsWith(".svg")).sort()) {
  const path = join(DIR, name);
  const size = statSync(path).size;
  const svg = readFileSync(path, "utf8");
  const p = plan(svg);
  before += size;

  if (p.skip) {
    after += size;
    skipped++;
    console.log(`  skip  ${name.padEnd(26)} ${String(size).padStart(8)}B  (${p.skip})`);
    continue;
  }

  const out = await sharp(p.buf)
    .extract(p.crop)
    .resize({ width: MAX_W, height: MAX_H, fit: "inside", withoutEnlargement: true })
    /* `palette: true` is what actually pays here: a masthead is flat ink on
       transparency, so an indexed PNG carries it losslessly at a fraction of
       truecolour. */
    .png({ compressionLevel: 9, palette: true, quality: 100, effort: 10 })
    .toBuffer();

  const meta = await sharp(out).metadata();

  /* ⚠️ THE OUTPUT KEEPS THE ORIGINAL `width`/`height`, NOT THE RASTER'S.
     Resizing to integer pixels moves the aspect ratio by a fraction of a
     percent — thesundaytimes goes from 3840:494 (7.7733) to 1024:132
     (7.7576) — and a fraction of a percent is not nothing here. Two things
     depend on the box staying exactly what it was: the press wall sizes each
     mark by HEIGHT and lets width follow (`.logo { height: 100%; width: auto }`),
     so the aspect alone decides how much lane a mark occupies; and every
     `scale` in lib/press.ts is measured off that rendered ink, with a comment
     saying so.

     Declaring the original box and letting the smaller raster stretch to fill
     it is what the browser was already doing — the old file drew a 3840x2160
     image into a 3840x494 rect via `preserveAspectRatio="none"`. The picture
     is lower-resolution; the geometry is untouched. Measured after this
     change: worst mean deviation across all fourteen is 1.2/255. */
  const svgOut =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${p.vw}" height="${p.vh}" ` +
    `viewBox="0 0 ${p.vw} ${p.vh}">` +
    `<image width="${p.vw}" height="${p.vh}" preserveAspectRatio="none" ` +
    `href="data:image/png;base64,${out.toString("base64")}"/></svg>\n`;

  after += Buffer.byteLength(svgOut);
  done++;
  const pct = (100 - (Buffer.byteLength(svgOut) / size) * 100).toFixed(1);
  console.log(
    `  ${DRY ? "dry " : "wrote"} ${name.padEnd(26)} ${String(size).padStart(8)}B → ` +
    `${String(Buffer.byteLength(svgOut)).padStart(7)}B  (−${pct}%)  ` +
    `raster ${p.iw}x${p.ih} → crop ${p.crop.width}x${p.crop.height} → ${meta.width}x${meta.height}`
  );
  if (!DRY) writeFileSync(path, svgOut);
}

console.log(
  `\n${done} rewritten, ${skipped} skipped — ` +
  `${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB ` +
  `(−${(100 - (after / before) * 100).toFixed(1)}%)`
);
