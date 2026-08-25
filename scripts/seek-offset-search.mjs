/* WHERE SHOULD THE FILM BE WHEN THE WINDOW OPENS?
 *
 * Loader.tsx seeks the hero clip to 0 before stage 1, which lands the whole
 * letter/window handover on the clip's opening seconds. Measured on the real
 * page, that stretch has nothing in the band the window actually shows: the
 * hole opens onto a flat olive field and only becomes a picture at t+696ms,
 * because the CLIP CUTS there — not because the window grew.
 *
 * This searches for the seek offset S that fixes it, on the reveal's real
 * clock (verified against the probe trace, see OFFSETS below):
 *
 *     currentTime ≈ S + (t + 25)/1000
 *
 *   window opens   t+320  -> S+0.345
 *   hold begins    t+433  -> S+0.458
 *   hold ends      t+617  -> S+0.642
 *   full bleed     t+1450 -> S+1.475
 *
 * Three tests, all on frames cut from the source file at the window's real
 * geometry (cover-fit maps the 118.8x27.7 viewport window to a 143x33 crop at
 * 889,527 in the 1920x1080 source):
 *
 *   1. HOLD CONTENT   the band must not be a flat field for any frame of the
 *                     hold. Scored as the WORST frame, not the mean — one dead
 *                     frame in the middle of a 184ms hold is still a dead hold.
 *   2. NO CUT         zero hard cuts between window-open and full bleed. A cut
 *                     mid-expansion was an earlier defect; don't trade back.
 *   3. LANDING        the frame at full bleed is the first thing a visitor sees
 *                     of the site, so it gets its own contrast/detail score.
 *
 * Gradients are reported as ON-SCREEN values (x0.62 for the .video
 * brightness filter) so they compare directly with window-content.mjs numbers
 * measured on the live page.
 *
 * Usage: node scripts/seek-offset-search.mjs <bandDir> <fullDir> [fps]
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [, , BAND, FULL, FPS = "25"] = process.argv;
const fps = +FPS;
const BRIGHTNESS = 0.62; // components/home/Hero.module.css .video filter

const OFF_OPEN = 0.345, OFF_HOLD_A = 0.458, OFF_HOLD_B = 0.642, OFF_FULL = 1.475;

const luma = (d, c, i) => 0.2126 * d[i * c] + 0.7152 * d[i * c + 1] + 0.0722 * d[i * c + 2];

async function stats(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const c = info.channels, W = info.width, H = info.height;
  const L = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) L[i] = luma(data, c, i);
  const mean = L.reduce((s, v) => s + v, 0) / L.length;
  const sd = Math.sqrt(L.reduce((s, v) => s + (v - mean) ** 2, 0) / L.length);
  let g = 0, n = 0;
  for (let y = 0; y < H; y++)
    for (let x = 1; x < W; x++) { g += Math.abs(L[y * W + x] - L[y * W + x - 1]); n++; }
  return { mean, sd, grad: g / n, L, W, H };
}

const bandFiles = fs.readdirSync(BAND).filter((f) => f.endsWith(".png")).sort();
const fullFiles = fs.readdirSync(FULL).filter((f) => f.endsWith(".png")).sort();
const N = Math.min(bandFiles.length, fullFiles.length);

const band = [], full = [];
for (let i = 0; i < N; i++) {
  band.push(await stats(path.join(BAND, bandFiles[i])));
  full.push(await stats(path.join(FULL, fullFiles[i])));
}

/* ---- cut map: mean |ΔL| per pixel against the previous frame ---- */
const diff = [0];
for (let i = 1; i < N; i++) {
  const a = full[i - 1].L, b = full[i].L;
  let d = 0;
  for (let k = 0; k < a.length; k++) d += Math.abs(a[k] - b[k]);
  diff.push(d / a.length);
}
const sorted = [...diff.slice(1)].sort((x, y) => x - y);
const med = sorted[Math.floor(sorted.length / 2)];
const CUT = Math.max(12, med * 6); // a hard cut is nothing like ordinary motion
const cuts = [];
for (let i = 1; i < N; i++) if (diff[i] > CUT) cuts.push({ i, t: +(i / fps).toFixed(3), d: +diff[i].toFixed(1) });

console.log(`frames ${N} @ ${fps}fps  |  median frame-to-frame |dL| ${med.toFixed(2)}  cut threshold ${CUT.toFixed(1)}`);
console.log(`\n== cut map, first ${(N / fps).toFixed(1)}s of belly-hero.mp4 ==`);
for (const c of cuts) console.log(`  CUT at currentTime ${c.t}s (frame ${c.i})   |dL| ${c.d}`);
if (!cuts.length) console.log("  (none)");
console.log(
  `  shots: ` +
    [0, ...cuts.map((c) => c.i)].map((s, k, a) => {
      const e = k + 1 < a.length ? a[k + 1] : N;
      return `${(s / fps).toFixed(2)}-${(e / fps).toFixed(2)}s`;
    }).join("  "),
);

/* ---- score every candidate S on the frame grid ---- */
const fr = (t) => Math.floor(t * fps);
const rows = [];
for (let s = 0; s < N; s++) {
  const S = s / fps;
  const hA = fr(S + OFF_HOLD_A), hB = fr(S + OFF_HOLD_B);
  const oA = fr(S + OFF_OPEN), fB = fr(S + OFF_FULL);
  if (fB >= N) break;
  let worstHold = Infinity, meanHold = 0, nH = 0;
  for (let i = hA; i <= hB; i++) {
    const g = band[i].grad * BRIGHTNESS;
    worstHold = Math.min(worstHold, g);
    meanHold += g; nH++;
  }
  meanHold /= nH;
  const cutInSpan = cuts.filter((c) => c.i > oA && c.i <= fB);
  /* how much of the shot is still to run once the site is on screen: land on
     the last 200ms of a shot and the visitor's first impression is a cut. */
  const nextCut = cuts.find((c) => c.i > fB);
  rows.push({
    S: +S.toFixed(2),
    headroom: +(((nextCut ? nextCut.i : N) - fB) / fps).toFixed(2),
    worstHold: +worstHold.toFixed(2),
    meanHold: +meanHold.toFixed(2),
    openGrad: +(band[oA].grad * BRIGHTNESS).toFixed(2),
    cuts: cutInSpan.length,
    cutAt: cutInSpan.map((c) => c.t).join(","),
    landSd: +(full[fB].sd * BRIGHTNESS).toFixed(1),
    landGrad: +(full[fB].grad * BRIGHTNESS).toFixed(2),
    landMean: +(full[fB].mean * BRIGHTNESS).toFixed(1),
  });
}

/* the live-page reference: flat reads ~1.43, a picture reads ~3.6 */
/* CALIBRATION, not a guessed threshold. window-content.mjs measured the live
   page either side of the clip's first cut: currentTime 0.712 read 1.44
   (flat) and 0.719 read 3.61 (a picture). Those are frames 17 and 18 here, so
   the page's grain overlay contributes a fixed additive term on top of
   raw x brightness. Solve it and quote every candidate in live-page units. */
const anchorFlat = band[17].grad * BRIGHTNESS, anchorPic = band[18].grad * BRIGHTNESS;
const scale = (3.61 - 1.44) / (anchorPic - anchorFlat);
const bias = 1.44 - anchorFlat * scale;
const onPage = (g) => g * scale + bias;
console.log(
  `\n== calibration to the live page ==\n` +
    `  frame 17 (ct 0.68, flat)    raw x0.62 ${anchorFlat.toFixed(2)}  -> page 1.44 (measured)\n` +
    `  frame 18 (ct 0.72, picture) raw x0.62 ${anchorPic.toFixed(2)}  -> page 3.61 (measured)\n` +
    `  page = raw x0.62 x ${scale.toFixed(2)} + ${bias.toFixed(2)}  (the + term is the .grain overlay)`,
);

/* the floor is the live-page value at which the window stopped reading as a
   swatch and started reading as a photograph — measured, not chosen. */
const PAGE_FLOOR = 3.4;
const FLOOR = (PAGE_FLOOR - bias) / scale;
const ok = rows.filter((r) => r.cuts === 0 && r.worstHold >= FLOOR);
console.log(
  `\n== candidates: no cut window-open -> full bleed, AND every hold frame >= ${PAGE_FLOOR} on-page ==\n` +
    `   S    | hold grad worst/mean (page) | @open | landing sd/grad/L | shot left after landing`,
);
for (const r of ok)
  console.log(
    `  ${r.S.toFixed(2)}s | ${onPage(r.worstHold).toFixed(2).padStart(10)} /${onPage(r.meanHold)
      .toFixed(2)
      .padStart(6)}        | ${onPage(r.openGrad).toFixed(2).padStart(5)} | ${r.landSd
      .toFixed(1)
      .padStart(5)} /${r.landGrad.toFixed(2).padStart(5)} /${r.landMean.toFixed(1).padStart(5)} | ${r.headroom.toFixed(2)}s`,
  );
console.log(`  ${ok.length} of ${rows.length} offsets qualify`);

console.log(`\n== S = 0 (what ships today), for comparison ==`);
const z = rows[0];
console.log(
  `  S 0.00s | hold worst ${z.worstHold} mean ${z.meanHold} | @open ${z.openGrad} | ` +
    `cuts in span: ${z.cuts}${z.cutAt ? " @" + z.cutAt + "s" : ""} | landing sd ${z.landSd}`,
);
fs.writeFileSync(path.join(path.dirname(BAND), "scores.json"), JSON.stringify({ cuts, rows }, null, 1));
