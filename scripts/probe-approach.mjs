/* Two checks the frame captures can't cover:
   1. what the chapter looks like as the reader APPROACHES it, before the
      sequence arms (the section is now its settled height, not 100svh, so
      its neighbours are on screen at the same time);
   2. that the post-intro interactions still work — the grid⟷strip toggle
      and the App Store expansion both hang off the same plate.
   usage: node scripts/probe-approach.mjs [port] [outdir] */
import puppeteer from "puppeteer-core";
import { play } from "./lib-intro.mjs";
import { mkdirSync, rmSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "55075";
const OUT = process.argv[3] || "/tmp/mgnhw_approach";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
// the site opens behind a loader; nothing below it is measurable until it goes
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
  timeout: 30000,
});
await sleep(1200);

// creep up on the section and shoot the approach
for (const frac of [0.85, 0.7]) {
  await page.evaluate((f) => {
    const el = document.querySelector("#restaurants");
    window.__lenis?.scrollTo(
      window.scrollY + el.getBoundingClientRect().top - innerHeight * f,
      { immediate: true },
    );
  }, frac);
  await sleep(500);
  await page.screenshot({ path: `${OUT}/approach_${frac}.png` });
}

// run the sequence out — arm it, THEN push the pinned scrub through, or
// the page is still held and everything below measures a parked stage
const { armed, scrubbed } = await play(page);
console.log("armed:", armed, "| scrub completed:", scrubbed);
await sleep(10500);

// scroll must be usable again
const before = await page.evaluate(() => window.scrollY);
await page.evaluate(() => window.__lenis?.scrollTo(window.scrollY + 300, { immediate: true }));
await sleep(400);
const after = await page.evaluate(() => window.scrollY);
console.log("scroll released:", after - before === 300 ? "yes" : `moved ${after - before}`);
await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }), before);
await sleep(400);

// the expansion
await page.evaluate(() => document.querySelector("#restaurants li button")?.click());
await sleep(900);
await page.screenshot({ path: `${OUT}/expanded.png` });
const dialog = await page.evaluate(() => !!document.querySelector("[role='dialog']"));
console.log("expansion opens:", dialog);
await page.keyboard.press("Escape");
await sleep(700);

// the strip toggle
await page.evaluate(() => {
  const btns = document.querySelectorAll("#restaurants [role='group'] button");
  btns[1]?.click();
});
await sleep(1200);
await page.screenshot({ path: `${OUT}/strip.png` });
const strip = await page.evaluate(() => {
  const ul = document.querySelector("#restaurants ul");
  return { scrollW: ul.scrollWidth, clientW: ul.clientWidth, cells: ul.children.length };
});
console.log("strip:", JSON.stringify(strip));
await browser.close();
