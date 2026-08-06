/* A SCREENSHOT WALK down a page — one frame per viewport, so the whole
   scroll can be read as a sequence rather than a description.

   Pinned chapters and scrubbed sections mean a stop is not settled the
   instant scrollY lands: the step is written, then rAF is given time to
   run the scrub out before the shutter. Frames land in the scratchpad as
   NN.png so they sort in reading order.

   usage: node scripts/probe-walk.mjs [path] [outDir] [w] [h] [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PATHNAME = process.argv[2] || "/";
const OUT = process.argv[3] || "/tmp/walk";
const W = Number(process.argv[4] || 1440);
const H = Number(process.argv[5] || 900);
const PORT = process.argv[6] || "3100";

mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: W, height: H });
await page.goto(`http://localhost:${PORT}${PATHNAME}`, {
  waitUntil: "networkidle2",
});
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 1200));

const total = await page.evaluate(() => document.body.scrollHeight);
const stops = Math.min(40, Math.ceil(total / H));
console.log(`page ${total}px / viewport ${H}px -> ${stops} frames`);

for (let i = 0; i < stops; i++) {
  const y = i * H;
  await page.evaluate((v) => window.scrollTo(0, v), y);
  // the scrub has to run out before the shutter, or the frame shows a
  // half-set section that no reader ever pauses on
  await new Promise((r) => setTimeout(r, 900));
  const name = `${String(i).padStart(2, "0")}.png`;
  await page.screenshot({ path: `${OUT}/${name}` });
  const at = await page.evaluate(() => Math.round(window.scrollY));
  console.log(`${name}  asked ${y}  landed ${at}`);
}

await b.close();
