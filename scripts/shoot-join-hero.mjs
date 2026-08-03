/* CAPTURE THE CAREERS PAGE — one full-page strip per viewport, plus a tight
   crop of the hero, so the scatter can actually be LOOKED at rather than
   reasoned about from numbers.

   Two things this harness has to get right, both learned the hard way:
   `page.screenshot({clip})` takes PAGE coordinates, not viewport ones, so the
   hero crop is taken with the page parked at y=0 and the clip read straight
   off getBoundingClientRect + scrollY; and `b.close()` can hang forever on
   GPU-backed headless Chrome, so it is raced against a timer.

   usage: node scripts/shoot-join-hero.mjs [port] [tag] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3187";
const TAG = process.argv[3] || "a";
const OUT = "/private/tmp/claude-501/-Users-ethanjameslegson-Work-Maginhawa-Maginhawa/2023fdca-cd86-4bca-922b-c2f81853e348/scratchpad/shots";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  ["1440x900", 1440, 900],
  ["1920x1080", 1920, 1080],
  ["820x1180", 820, 1180],
  ["390x844", 390, 844],
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--use-gl=angle",
  ],
});

for (const [name, w, h] of VIEWPORTS) {
  const page = await b.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://localhost:${PORT}/careers`, {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 30000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // the print entrance ramp is 140ms + 6*90ms + 1000ms ≈ 1.7s; wait it out
  // so the capture is of the SETTLED hero, not a frame of its arrival
  await sleep(4200);

  await page.screenshot({ path: `${OUT}/join-${TAG}-${name}-hero.png` });

  /* EVERY SHOT IS A PLAIN VIEWPORT SHOT. The obvious way to frame a section
     is `screenshot({clip})` with a page-coordinate rect, and it lies: a clip
     taller than the viewport makes Chrome capture beyond the viewport, which
     re-renders the page — and on that re-render the hero came back missing
     its five deepest prints while `getBoundingClientRect` still reported them
     present. Half an hour was spent looking for a CSS bug that was a capture
     artefact. Scroll the section to the top of the window and shoot what is
     actually on screen instead; two frames if it is taller than one. */
  const marks = await page.evaluate(() => {
    const y = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, h: r.height };
    };
    return {
      roles: y('[class*="JoinUs_roles"]'),
      form: y('[class*="JoinUs_form__"]'),
    };
  });

  for (const [label, m] of Object.entries(marks)) {
    if (!m) continue;
    const frames = Math.min(3, Math.ceil(m.h / h));
    for (let f = 0; f < frames; f++) {
      await page.evaluate(
        (y) => window.__lenis?.scrollTo(y, { immediate: true }) ?? scrollTo(0, y),
        Math.max(0, m.top - 24 + f * (h - 60)),
      );
      await sleep(1500);
      await page.screenshot({
        path: `${OUT}/join-${TAG}-${name}-${label}${frames > 1 ? f + 1 : ""}.png`,
      });
    }
  }

  await page.close();
  console.log(`  shot ${name}`);
}

const shutdown = async () => {
  const proc = b.process();
  await Promise.race([b.close().catch(() => {}), sleep(3000)]);
  try {
    proc?.kill("SIGKILL");
  } catch {}
  process.exit(0);
};
await shutdown();
