/* The chapter change and the highlighter. usage: node scripts/shoot-pin.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { arm, started } from "./lib-intro.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT =
  "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/pin";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#restaurants", { timeout: 60000 });
await page.waitForFunction(
  () => !document.body.classList.contains("is-loading"),
  { timeout: 60000 },
);
await sleep(1200);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// walk into the chapter, let the assembly play, and watch the marker land.
// The intro only arms once the title reaches the middle of the screen, so
// this has to WALK there rather than jump.
if (!(await arm(page))) throw new Error("the chapter's intro never armed");
await started(page);
await page.waitForFunction(
  () =>
    document.documentElement.style.overflow !== "hidden" &&
    !document.querySelector("[data-assembly-step]"),
  { timeout: 60000, polling: 200 },
);
// "Restaurants." warms 0.3s after DONE, over 0.8s
await sleep(500);
await shot("00-ink-warming");
await sleep(1400);
await shot("01-ink-saffron");

/* THE MARQUEE must not stop under the cursor. Park it on the lane, then
   watch the track's own transform across a second of wall clock. */
await page.evaluate(() => {
  const lane = document.querySelector('[class*="PressWall_lane"]');
  lane.scrollIntoView({ block: "center" });
});
await sleep(500);
const laneBox = await page.evaluate(() => {
  const r = document
    .querySelector('[class*="PressWall_lane"]')
    .getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(laneBox.x, laneBox.y);
const readTrack = () =>
  page.evaluate(
    () =>
      new DOMMatrixReadOnly(
        getComputedStyle(document.querySelector('[class*="PressWall_track"]'))
          .transform,
      ).m41,
  );
const t0 = await readTrack();
await sleep(1000);
const t1 = await readTrack();
console.log(
  `MARQUEE under the cursor: travelled ${Math.abs(t1 - t0).toFixed(1)}px in 1s  (0 = it stopped)`,
);

// the chapter change
const park = () =>
  page.evaluate(() => {
    const zone = document.querySelector('div[class*="MaroonZone_zone"]');
    window.__lenis?.scrollTo(
      window.scrollY + zone.getBoundingClientRect().top - innerHeight,
      { immediate: true },
    );
  });
await park();
await sleep(1200);
await shot("02-cover-0");
for (let i = 0; i < 5; i++) {
  await page.evaluate(() =>
    window.__lenis?.scrollTo(window.scrollY + 180, { immediate: true }),
  );
  await sleep(260);
  await shot(`0${3 + i}-cover-${i + 1}`);
}
await page.evaluate(() =>
  window.__lenis?.scrollTo(window.scrollY + 260, { immediate: true }),
);
await sleep(700);
await shot("08-about");

console.log(OUT);
await b.close();
