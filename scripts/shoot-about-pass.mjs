/* THE WHOLE INTRO, AT EVERY VIEWPORT THAT MATTERS, ANCHORED TO ELEMENTS.

   shoot-about-intro.mjs shoots fixed pixel offsets at one viewport, which is
   the right tool while the hero is the only thing being judged and the wrong
   one the moment the sections below it change height: 900/1800/2700 lands
   mid-block at 1440 and nowhere near the same content at 390.

   So this seeks by ELEMENT — hero, statement (three points through its scrub),
   chef, and the deck's first seat — and repeats the set at 1440x900,
   1920x1080, 820x1180 and 390x844. Same anchors, four windows, so a shot at
   one width is directly comparable with the same shot at another.

   usage: node scripts/shoot-about-pass.mjs [port] */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = process.argv[2] || "3100";
const OUT = "/tmp/mgnhw_about";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWS = [
  ["desktop", 1440, 900],
  ["wide", 1920, 1080],
  ["tablet", 820, 1180],
  ["phone", 390, 844],
];

/* [label, selector, where in the element's own travel to sit].
   `f` is the fraction of the way from "element top at viewport bottom" to
   "element bottom at viewport top" — 0.5 is the element centred, and the
   three statement samples walk its scrub. */
const STOPS = [
  ["1-hero", null, 0],
  ["2-statement-a", '[class*="statementText"]', 0.3],
  ["3-statement-b", '[class*="statementText"]', 0.5],
  ["4-statement-c", '[class*="statementText"]', 0.72],
  ["5-chef", '[class*="chefGrid"]', 0.5],
  ["6-deck", '[class*="railPinWrap"]', 0.08],
  ["7-deck-mid", '[class*="railPinWrap"]', 0.45],
];

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--enable-gpu",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

for (const [name, W, H] of VIEWS) {
  const page = await b.newPage();
  await page.setViewport({ width: W, height: H });
  await page.goto(`http://localhost:${PORT}/about`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .waitForFunction(() => !document.body.classList.contains("is-loading"), {
      timeout: 60000,
    })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await sleep(3600); // the entrance, the settle and the film's first frames

  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`\n${name} ${W}x${H}   doc ${docH}px`);

  for (const [label, sel, f] of STOPS) {
    const y = await page.evaluate(
      (s, frac, vh) => {
        if (!s) return 0;
        const e = document.querySelector(s);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        const top = r.top + scrollY;
        /* 0 -> element's top on the viewport's bottom edge;
           1 -> element's bottom on the viewport's top edge */
        return Math.max(0, top - vh + frac * (r.height + vh));
      },
      sel,
      f,
      H,
    );
    if (y === null) {
      console.log(`  ${label.padEnd(15)} (element absent)`);
      continue;
    }
    await page.evaluate(
      (v) => window.__lenis?.scrollTo(v, { immediate: true }) ?? scrollTo(0, v),
      y,
    );
    await sleep(1500);
    await page.screenshot({ path: `${OUT}/${name}-${label}.png` });
    console.log(`  ${label.padEnd(15)} y=${Math.round(y)}`);
  }
  await page.close();
}

console.log(`\n shots -> ${OUT}`);
await b.close();
