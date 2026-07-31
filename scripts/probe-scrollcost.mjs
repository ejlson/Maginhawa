/* Ambient scroll cost. The Discover intro's own frames were always clean;
   what users feel is the cost of scrolling ORDINARY page, which is global
   (CustomCursor, the fixed blur bands) rather than any one section's
   animation. Samples the same travel distance in several places.
   usage: node scripts/probe-scrollcost.mjs [port] */
import puppeteer from "puppeteer-core";
import { ready, sleep } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await ready(page, PORT);
// get the once-per-session intro out of the way — it holds the page
await page.evaluate(() => window.__lenis?.scrollTo(document.body.scrollHeight, { immediate: true }));
await sleep(1400);

// a pointer parked over the page, so the global cursor resolves every frame
// exactly as it would for a real reader
await page.mouse.move(720, 450);

const run = async (label, frac) => {
  await page.evaluate((f) => window.__lenis?.scrollTo(document.body.scrollHeight * f, { immediate: true }), frac);
  await sleep(800);
  await page.evaluate(() => { window.__f = []; let l = performance.now();
    const t = (x) => { window.__f.push(Math.round(x - l)); l = x; requestAnimationFrame(t); };
    requestAnimationFrame(t); });
  for (let i = 0; i < 19; i++) {
    // jiggle the pointer too — mousemove is the other half of the load
    await page.mouse.move(700 + (i % 5) * 6, 440 + (i % 3) * 5);
    await page.evaluate(() => window.__lenis?.scrollTo(window.scrollY + 90, { immediate: true }));
    await sleep(80);
  }
  const f = await page.evaluate(() => window.__f.slice());
  const over = f.filter(d => d > 32).length;
  console.log(`${label.padEnd(30)} frames ${String(f.length).padStart(4)} | worst ${String(Math.max(...f)).padStart(3)}ms | >32ms ${String(over).padStart(3)} (${Math.round(over / f.length * 100)}%)`);
};
await run("hero", 0.02);
await run("Discover -> About seam", 0.30);
await run("As Seen In / interlude", 0.42);
await run("plain cream journal", 0.72);
await b.close();
