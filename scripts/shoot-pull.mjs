/* Frame-by-frame capture of the SPLIT alone, as a contact sheet.

   The whole assembly is eleven seconds long; the beat under test is the
   1.4s in which the words part and the plate is pulled open between them.
   shoot-assembly.mjs samples the whole thing at 150ms, which is far too
   coarse to read a pull — this one shoots the split at 60ms, cropped to the
   band the composition actually occupies, and tiles the frames into one
   sheet so the growth can be read as a sequence rather than opened one file
   at a time.

   usage: node scripts/shoot-pull.mjs [port] [outdir] [everyMs] */
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync, rmSync, readdirSync } from "node:fs";
import { ready, arm, sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3210";
const OUT = process.argv[3] || "/tmp/mgnhw_pull";
const EVERY = Number(process.argv[4] || 60);
// the split fires 1780ms after the sequence arms and settles ~1.4s later
const FROM = Number(process.argv[5] || 1600);
const TO = Number(process.argv[6] || 3700);
// the crop, as a box around the middle of the screen. A screenshot costs
// ~100ms, so the sheet's real cadence is ~100ms however small EVERY is —
// the exact numbers come from probe-pull.mjs, which samples every frame.
const BAND = Number(process.argv[7] || 300);
const WIDE = Number(process.argv[8] || 1440);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

await ready(page, PORT);
const armed = await arm(page);
const t0 = Date.now();
console.log(armed ? "armed" : "NEVER ARMED — capturing anyway");

// page.screenshot({clip}) is in PAGE coordinates, so the band has to carry
// the scroll offset — the page is held still for the whole beat, so one
// reading is good for every frame
const clip = await page.evaluate(
  ({ band, wide }) => ({
    x: Math.round((window.innerWidth - wide) / 2),
    y: window.scrollY + window.innerHeight / 2 - band / 2,
    width: wide,
    height: band,
  }),
  { band: BAND, wide: WIDE },
);

await sleep(Math.max(0, FROM - (Date.now() - t0)));
let i = 0;
const shots = [];
for (let t = FROM; t <= TO; t += EVERY) {
  const at = Date.now() - t0;
  const s = await page.evaluate(() => {
    const p = document.querySelector("[data-deck-pull]");
    const w = document.querySelectorAll("[data-intro-word]");
    if (!p || w.length !== 2) return null;
    const m = new DOMMatrixReadOnly(getComputedStyle(p).transform);
    return {
      scale: Math.round(m.m11 * 1000) / 1000,
      gap: Math.round(
        w[1].getBoundingClientRect().left - w[0].getBoundingClientRect().right,
      ),
    };
  });
  const name = `${OUT}/f${String(i).padStart(3, "0")}_${String(at).padStart(5, "0")}ms_s${s ? s.scale.toFixed(3) : "----"}_g${s ? s.gap : "---"}.png`;
  await page.screenshot({ path: name, clip });
  shots.push(name);
  i++;
  const drift = Date.now() - t0 - (t + EVERY);
  if (drift < 0) await sleep(-drift);
}
console.log(`captured ${i} frames -> ${OUT}`);
await browser.close();

// tile them into contact sheets — 4 columns, downscaled, in shot order
const files = readdirSync(OUT).filter((f) => f.startsWith("f")).sort();
const COLS = Number(process.argv[9] || 4);
const W = 520;
const H = Math.round((BAND * W) / WIDE);
const PER = 24;
for (let s = 0; s * PER < files.length; s++) {
  const page = files.slice(s * PER, (s + 1) * PER);
  const rows = Math.ceil(page.length / COLS);
  const tiles = await Promise.all(
    page.map(async (f, n) => ({
      input: await sharp(`${OUT}/${f}`).resize(W, H).toBuffer(),
      left: (n % COLS) * W,
      top: Math.floor(n / COLS) * H,
    })),
  );
  await sharp({
    create: {
      width: COLS * W,
      height: rows * H,
      channels: 3,
      background: { r: 20, g: 20, b: 20 },
    },
  })
    .composite(tiles)
    .png()
    .toFile(`${OUT}/sheet${s}.png`);
  console.log(`sheet${s}.png  ${page[0]} … ${page[page.length - 1]}`);
}
