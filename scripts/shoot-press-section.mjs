/* THE PRESS SECTION AS A READER MEETS IT — label, lane, edge fades and all.

   probe-press-lane.mjs strips the lane down to measure it (mask off, drift
   frozen, track driven by hand). This leaves everything alone and simply
   photographs the section, because the question "do they look the same
   size?" is answered by looking, and a stripped lane is not what ships.

   Two frames per run: the section at rest, and the same section a third of
   the way through the drift, so a mark that only reads badly at one point in
   the loop cannot hide.

   Usage: node scripts/shoot-press-section.mjs [port] [tag] [width]  */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3000";
const TAG = process.argv[3] || "now";
const W = Number(process.argv[4] || 1440);
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/082df041-cd16-47f8-81ae-892042eaee11/scratchpad";
mkdirSync(OUT, { recursive: true });
const s = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: 900, deviceScaleFactor: 2 });
await page.goto(`http://localhost:${PORT}/`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page
  .waitForFunction(() => !document.body.classList.contains("is-loading"), {
    timeout: 20000,
  })
  .catch(() => {});
await page.evaluate(() => document.fonts.ready);
await s(1800);

const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 500) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await s(110);
}
await s(700);

await page.evaluate(() => {
  const t = document.querySelector("ul[class*='PressWall_track']");
  const sec = t.closest("section");
  window.scrollTo(0, sec.getBoundingClientRect().top + window.scrollY - 60);
});
await s(1400);

/* Freeze wherever the drift happens to be, then shoot; then advance the
   animation a third of a loop and shoot again. currentTime on the running
   Animation retimes without restarting the interpolation, so the second
   frame is a real point in the loop rather than a fresh start. */
for (const [i, frac] of [0, 0.33].entries()) {
  await page.evaluate((f) => {
    const t = document.querySelector("ul[class*='PressWall_track']");
    const a = t.getAnimations()[0];
    if (a) {
      a.pause();
      a.currentTime = f * 72000;
    }
  }, frac);
  await s(400);
  const file = `${OUT}/press-section-${TAG}-${W}-${i}.png`;
  await page.screenshot({ path: file });
  console.log(`wrote ${file}`);
}
await browser.close();
