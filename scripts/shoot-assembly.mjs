/* Frame-by-frame capture of the Discover assembly intro.
   Scrolls the "Our Restaurants." title into the arming band, then shoots a
   dense strip of frames so the whole choreography can be read as a
   contact sheet.

   usage: node scripts/shoot-assembly.mjs [port] [outdir] [everyMs] [totalMs] */
import puppeteer from "puppeteer-core";
import { mkdirSync, rmSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "55075";
const OUT = process.argv[3] || "/tmp/mgnhw_assembly";
const EVERY = Number(process.argv[4] || 150);
const TOTAL = Number(process.argv[5] || 11000);

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

page.on("response", (r) => {
  if (r.status() >= 400) console.log(`  ${r.status()} ${r.url().slice(0, 120)}`);
});
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
// the site opens behind a loader — capturing before it lifts just shoots
// the loader for ten seconds
await page.waitForSelector("#restaurants [data-plate]", { timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains("is-loading"), {
  timeout: 60000,
});
// let fonts land and the hero settle
await sleep(1500);

// jump to just ABOVE the arming band, then creep in — the trigger wants the
// title's centre inside the middle 24% of the viewport
await page.evaluate(() => {
  const el = document.querySelector("#restaurants");
  if (!el) throw new Error("no #restaurants");
  const r = el.getBoundingClientRect();
  const target = window.scrollY + r.top - window.innerHeight * 0.15;
  window.__lenis?.scrollTo(target, { immediate: true });
  window.scrollTo(0, target);
});
await sleep(900);

// nudge in small steps until the sequence arms, so the trigger fires the way
// a real reader's scroll fires it
const t0 = Date.now();
let armed = false;
for (let i = 0; i < 60 && !armed; i++) {
  await page.evaluate(() => {
    window.__lenis?.scrollTo(window.scrollY + 40, { immediate: true });
    window.scrollTo(0, window.scrollY + 40);
  });
  await sleep(60);
  armed = await page.evaluate(
    () => !!document.querySelector("[data-assembly-armed='1']"),
  );
}
const armedAt = Date.now();
console.log(armed ? `armed after ${armedAt - t0}ms` : "NEVER ARMED — capturing anyway");

let i = 0;
for (let t = 0; t <= TOTAL; t += EVERY) {
  const stamp = String(Date.now() - armedAt).padStart(5, "0");
  await page.screenshot({
    path: `${OUT}/f${String(i).padStart(3, "0")}_${stamp}ms.png`,
  });
  i++;
  const drift = Date.now() - armedAt - t;
  if (drift < EVERY) await sleep(EVERY - Math.max(0, drift));
}
console.log(`captured ${i} frames -> ${OUT}`);
await browser.close();
