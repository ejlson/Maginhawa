/* PRESS LOGO INK GEOMETRY — the measurement behind `scale` in lib/press.ts.

   WHY THIS EXISTS. `.logoSeat` gives every masthead the same BOX height and
   `.logo` fills it with `height: 100%`. That equalises the boxes, not the
   ink. Every file in /public/press-logo is a Figma export of a raster PNG
   wrapped in an <svg><rect fill=pattern>, and each was cropped by a
   different hand: timeout.svg is a 3840x2160 frame with a small wordmark
   floating in it, theindependent.svg is a 3747x363 letterbox. Two logos on
   identical 22px boxes therefore draw wildly different amounts of ink, which
   is what "they look different sizes" means and why hand-guessed multipliers
   never converged.

   WHAT IT MEASURES. Each SVG is drawn into a canvas in CHROME (not librsvg —
   Chrome is what ships, so Chrome is the ground truth) at a fixed 600px box
   height, then every pixel is classified as ink or ground and the ink's
   bounding box is taken. `inkRatio` = inkHeight / boxHeight is the number
   that matters: rendered ink = seatHeight x inkRatio, so equal ink across
   the lane needs scale_i proportional to 1 / inkRatio_i.

   IT ALSO SPLITS ROWS INTO BANDS. A row of pixels either has ink or does
   not; contiguous inked rows separated by a clear gap of >=3% of the box are
   reported as separate BANDS. That is how the two-line lockups (BBC Good
   Food, Country & Townhouse) are identified without hardcoding their names,
   and it gives the dominant band's height, which is the number those two are
   matched on instead of their full ink box.

   ALSO REPORTS THE max-width BIND. `.logo` carries
   `max-width: clamp(120px, 12vw, 200px)`, and with `object-fit: contain` a
   mark whose natural width at the seat height exceeds that cap is scaled
   DOWN — its ink shrinks no matter how large `scale` is. `widthAtSeat` and
   `bindsAt` say where each mark hits the cap.

   Usage: node scripts/probe-press-ink.mjs [port]  */
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/082df041-cd16-47f8-81ae-892042eaee11/scratchpad";

const LOGOS = [
  ["The Sunday Times", "thesundaytimes.svg"],
  ["Michelin Guide", "michelin.svg"],
  ["The Guardian", "theguardian.svg"],
  ["The Independent", "theindependent.svg"],
  ["BBC Good Food", "bbcgoodfood.svg"],
  ["Time Out", "timeout.svg"],
  ["Forbes", "forbes.svg"],
  ["Evening Standard", "eveningstandard.svg"],
  ["The Week", "theweek.svg"],
  ["Metro", "metro.svg"],
  ["Country & Townhouse", "country-townhouse.svg"],
  ["The Infatuation", "infatuation.svg"],
  ["Hypebeast", "hypebeast.svg"],
  ["That's Up", "thatsup.svg"],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});

const rows = await page.evaluate(async (files) => {
  const BOX = 600; // render height; ratios are scale-free, this is precision
  const out = [];
  for (const [name, file] of files) {
    const img = new Image();
    img.src = `/press-logo/${file}`;
    await img.decode();
    const aspect = img.naturalWidth / img.naturalHeight;
    const w = Math.round(BOX * aspect);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = BOX;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, BOX);
    const d = ctx.getImageData(0, 0, w, BOX).data;

    /* INK = anything that is not the cream ground showing through. The lane
       applies grayscale(1) so colour is irrelevant; what reads is coverage.
       A pixel counts as ink if it is opaque enough to occlude AND dark
       enough to differ from paper: a >=90% white opaque pixel is a white
       plate behind the mark, not the mark. Both thresholds are recorded so
       a later reader can see which one did the work. */
    const rowInk = new Array(BOX).fill(0);
    const colInk = new Array(w).fill(0);
    let alphaTop = -1,
      alphaBot = -1;
    for (let y = 0; y < BOX; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = d[i + 3];
        if (a < 24) continue;
        if (alphaTop < 0) alphaTop = y;
        alphaBot = y;
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        // premultiply toward white paper so a translucent dark pixel is
        // judged on what it actually puts on the page
        const eff = lum * (a / 255) + 255 * (1 - a / 255);
        if (eff < 229) {
          rowInk[y]++;
          colInk[x]++;
        }
      }
    }
    let top = rowInk.findIndex((n) => n > 0);
    let bot = rowInk.length - 1 - [...rowInk].reverse().findIndex((n) => n > 0);
    let left = colInk.findIndex((n) => n > 0);
    let right = colInk.length - 1 - [...colInk].reverse().findIndex((n) => n > 0);
    if (top < 0) {
      out.push({ name, file, empty: true });
      continue;
    }

    /* BANDS: contiguous inked rows, split on a clear gap of >=3% of the box.
       Dust rows (a single stray pixel) are not enough to bridge a gap, so a
       row needs >=0.4% of the width inked to count as inked here. */
    const need = Math.max(1, Math.round(w * 0.004));
    const GAP = Math.round(BOX * 0.03);
    const bands = [];
    let run = null,
      clear = 0;
    for (let y = 0; y <= BOX; y++) {
      const on = y < BOX && rowInk[y] >= need;
      if (on) {
        if (!run) run = { top: y, bot: y };
        else run.bot = y;
        clear = 0;
      } else if (run) {
        clear++;
        if (clear > GAP || y === BOX) {
          bands.push({ ...run, h: run.bot - run.top + 1 });
          run = null;
        }
      }
    }
    out.push({
      name,
      file,
      natW: img.naturalWidth,
      natH: img.naturalHeight,
      aspect: +aspect.toFixed(4),
      boxH: BOX,
      inkTop: top,
      inkBot: bot,
      inkH: bot - top + 1,
      inkRatio: +((bot - top + 1) / BOX).toFixed(4),
      inkW: right - left + 1,
      inkWRatio: +((right - left + 1) / w).toFixed(4),
      alphaRatio: +((alphaBot - alphaTop + 1) / BOX).toFixed(4),
      bands: bands.map((b) => ({
        top: b.top,
        h: b.h,
        r: +(b.h / BOX).toFixed(4),
      })),
    });
  }
  return out;
}, LOGOS);

/* ---- report ---- */
const MAXW = 172.8; // clamp(120px, 12vw, 200px) resolved at a 1440 viewport
console.log(
  "name                  natWxH        aspect  inkRatio  bands(h/box)                inkW%",
);
for (const r of rows) {
  if (r.empty) {
    console.log(`${r.name.padEnd(21)} ** NO INK FOUND **`);
    continue;
  }
  const bands = r.bands.map((b) => b.r.toFixed(3)).join(" ");
  console.log(
    `${r.name.padEnd(21)} ${String(r.natW + "x" + r.natH).padEnd(13)} ` +
      `${r.aspect.toFixed(2).padStart(6)}  ${r.inkRatio.toFixed(4).padStart(8)}  ` +
      `${bands.padEnd(27)} ${(r.inkWRatio * 100).toFixed(0).padStart(4)}%`,
  );
}

console.log("\n-- max-width bind: seat height at which natural width hits 172.8px --");
for (const r of rows) {
  if (r.empty) continue;
  console.log(
    `${r.name.padEnd(21)} binds above seat = ${(MAXW / r.aspect).toFixed(1)}px`,
  );
}

writeFileSync(`${OUT}/press-ink.json`, JSON.stringify(rows, null, 2));
console.log(`\nwrote ${OUT}/press-ink.json`);
await browser.close();
